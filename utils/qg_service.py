from __future__ import annotations
import os, json, re, asyncio
from typing import List, Literal, Optional, Dict, Any

# HF Transformers
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

# schemas에서 정의할 모델을 가져옵니다.
from schemas import QuestionItem

# =========================================================
# 설정값 (Qwen3-4B-Instruct-2507 모델 사용)
# =========================================================
QG_MODEL_NAME = os.getenv("QG_MODEL_NAME", "Qwen/Qwen3-4B-Instruct-2507") 
QG_MAX_NEW_TOKENS = int(os.getenv("QG_MAX_NEW_TOKENS", "4096"))
QG_TEMPERATURE = float(os.getenv("QG_TEMPERATURE", "0.2"))
HF_API_TOKEN = os.getenv("HF_API_TOKEN") or None

_QG_MODEL = None
_QG_TOKENIZER = None

# =========================================================
# 모델 로딩 유틸 (GPU 0 및 CPU 분산 배치 적용)
# =========================================================
def _resolve_dtype():
    # bf16 지원 시 bf16, 아니면 fp16 사용
    if torch.cuda.is_available():
        if torch.cuda.is_bf16_supported():
            return torch.bfloat16
        return torch.float16
    return None

def _load_qg_model():
    """Qwen3-4B 모델을 GPU 0과 CPU에 분산 로드합니다."""
    global _QG_MODEL, _QG_TOKENIZER
    if _QG_MODEL is not None and _QG_TOKENIZER is not None:
        return _QG_MODEL, _QG_TOKENIZER

    torch_dtype = _resolve_dtype()
    load_in_4bit = os.getenv("HF_LOAD_IN_4BIT", "false").lower() in ("1", "true", "yes")

    print(f"QG 모델 로딩 중: {QG_MODEL_NAME}, 4bit={load_in_4bit}")

    hub_kwargs = {"trust_remote_code": True}
    if HF_API_TOKEN:
        hub_kwargs["token"] = HF_API_TOKEN
        
    try:
        # 1. 토크나이저 로드
        _QG_TOKENIZER = AutoTokenizer.from_pretrained(QG_MODEL_NAME, **hub_kwargs)

        # 2. 모델 로드 설정 (kwargs 준비)
        kwargs = dict(hub_kwargs)
        if load_in_4bit:
            try:
                kwargs.update({"load_in_4bit": True})
            except Exception:
                pass
        
        if not load_in_4bit and torch_dtype is not None:
            kwargs["dtype"] = torch_dtype
                
        # 생성자 오류 방지를 위해 dtype 인자를 최종적으로 제거
        kwargs.pop("dtype", None) 

        # 🛑 GPU 0과 CPU에만 명시적으로 메모리 할당
        if torch.cuda.is_available():
            max_memory = {
                0: '23GiB',     
                'cpu': '30GiB', 
            }
            device_map = 'auto' 
            kwargs['max_memory'] = max_memory
            print(f"GPU 0 및 CPU 분산 배치 적용: {max_memory}")
        else:
            device_map = 'auto'

        # 3. 모델 로드 (명시적 분산 배치 적용)
        _QG_MODEL = AutoModelForCausalLM.from_pretrained(
            QG_MODEL_NAME, 
            device_map=device_map,
            **kwargs
        )
        
        return _QG_MODEL, _QG_TOKENIZER
    except Exception as e:
        print(f"QG 모델 로딩 실패: {e}")
        raise RuntimeError(f"QG 모델 로딩 실패: {QG_MODEL_NAME} (오류 내용: {e})") from e

# =========================================================
# 텍스트 전처리 / 프롬프트 빌드 (변경 없음)
# =========================================================
def _extract_key_points(full_text: str) -> str:
    """텍스트에서 '핵심 요점' 섹션만 추출합니다. 추출 실패 시 전체 텍스트를 반환합니다."""
    import re
    
    match = re.search(
        r"##\s*(핵심 요점|KEY POINTS|KEY TAKEAWAYS)\s*\n(.*?)(\n##\s*|\Z)", 
        full_text, 
        re.DOTALL | re.IGNORECASE
    )
    
    if match:
        return "핵심 요점:\n" + match.group(2).strip()
    
    print("경고: '핵심 요점' 섹션 추출 실패. 전체 텍스트를 기반으로 문제 생성 지시.")
    return full_text


def _build_qg_prompt(tokenizer, system_text: str, user_text: str) -> str:
    """토크나이저의 챗 템플릿을 사용하여 프롬프트를 구성합니다."""
    messages = [
        {"role": "system", "content": system_text},
        {"role": "user", "content": user_text},
    ]
    return tokenizer.apply_chat_template(
        messages, 
        tokenize=False, 
        add_generation_prompt=True
    )

def _get_system_prompt(num: int, q_type: str, lang: str) -> str:
    """문제 생성에 특화된 시스템 프롬프트를 생성합니다."""
    lang_name = "한국어" if lang == "ko" else "English"
    q_type_desc = "객관식 (4지선다, 정답 포함)" if q_type == "multiple_choice" else "단답형 주관식"
    
    return (
        f"당신은 '{lang_name}'로 작성된 텍스트를 분석하여 전문가 수준의 교육용 문제를 생성하는 봇입니다. "
        "입력 텍스트의 '핵심 요점' 섹션에 명시된 사실만을 근거로 문제를 생성해야 합니다. "
        f"{num}개의 '{q_type_desc}' 문제를 생성하세요. "
        "출력은 **반드시** JSON 배열 형식만 사용해야 합니다. 다른 설명이나 사족을 추가하지 마세요. "
        
        "\n\nJSON 형식: "
        "[\n  {\n    \"question\": \"[질문 내용]\",\n    \"answer\": \"[정답]\",\n    \"options\": [\"[보기 1]\", \"[보기 2]\", \"[보기 3]\", \"[보기 4]\"]  // 객관식일 경우\n  }\n]"
        "\n\n규칙:\n"
        "1. 정답은 반드시 'options' 리스트 내에 포함되어야 합니다.\n"
        "2. 질문은 명확하고, 정답은 '핵심 요점'에 기반해야 합니다.\n"
        "3. 마크다운(```` `)이나 다른 꾸밈 없이 순수 JSON 배열만 출력합니다."
    )

# =========================================================
# 메인 문제 생성 함수 (문제/답안 파일 저장 로직 포함)
# =========================================================
async def generate_questions_from_text(
    text: str,
    num_questions: int,
    question_type: Literal["multiple_choice", "short_answer"],
    language: Literal["ko", "en"],
) -> List[QuestionItem]:
    
    # 1. 모델 로드
    try:
        model, tokenizer = _load_qg_model()
    except RuntimeError:
        raise
        
    # 2. 텍스트 전처리 (핵심 요점 추출)
    key_points_only = _extract_key_points(text)
    
    # 3. 프롬프트 구성
    system_prompt = _get_system_prompt(num_questions, question_type, language)
    user_payload = f"다음 '핵심 요점' 텍스트를 기반으로 문제를 생성합니다:\n\n---\n{key_points_only}"
    prompt = _build_qg_prompt(tokenizer, system_prompt, user_payload)

    # 4. LLM 추론 (비동기 처리)
    def _generate_sync():
        """모델 추론을 위한 동기 함수"""
        inputs = tokenizer(prompt, return_tensors="pt")
        
        target_device = getattr(model, "device", "cuda:0")
        if torch.cuda.is_available():
            try:
                inputs = {k: v.to(target_device) for k, v in inputs.items()}
            except Exception:
                pass

        gen_kwargs = dict(
            max_new_tokens=QG_MAX_NEW_TOKENS,
            do_sample=True,
            temperature=QG_TEMPERATURE,
            repetition_penalty=1.05,
            eos_token_id=tokenizer.eos_token_id,
            pad_token_id=tokenizer.eos_token_id or tokenizer.pad_token_id,
        )
        
        with torch.no_grad():
            out = model.generate(**inputs, **gen_kwargs)
            
        gen_ids = out[0, inputs["input_ids"].shape[1]:]
        return tokenizer.decode(gen_ids, skip_special_tokens=True).strip()

    # 동기 함수를 비동기로 실행
    loop = asyncio.get_event_loop()
    raw_json_output = await loop.run_in_executor(None, _generate_sync)
    
    # 5. JSON 파싱 및 데이터 정리 + 파일 저장
    try:
        if raw_json_output.startswith("```"):
            raw_json_output = re.sub(r"^```json\s*", "", raw_json_output, flags=re.IGNORECASE)
            raw_json_output = re.sub(r"```\s*$", "", raw_json_output)
        
        json_data: List[Dict[str, Any]] = json.loads(raw_json_output)
        
        # Pydantic 모델로 변환하여 문제/답안 데이터를 준비
        question_items = [QuestionItem(**item) for item in json_data]
        
        # Prepare file-friendly 'note' objects (title + content) for questions and answers
        questions_for_file = []
        answers_for_file = []
        
        for idx, item in enumerate(question_items, 1):
            # Build markdown content for question note
            md_lines = []
            md_lines.append(f"### 문제 {idx}")
            md_lines.append("")
            md_lines.append(item.question)
            md_lines.append("")
            if item.options:
                # numbered options
                for opt_idx, opt in enumerate(item.options, 1):
                    md_lines.append(f"{opt_idx}. {opt}")
            question_md = "\n".join(md_lines)
            # 문제 경계 구분선 추가
            question_md = question_md + "\n\n---\n\n"

            questions_for_file.append({
                "title": f"문제 {idx}",
                "content": question_md
            })

            # Build markdown content for answer note
            ans_lines = []
            ans_lines.append(f"### 답안 {idx}")
            ans_lines.append("")
            # Provide a short preview of the question followed by the correct answer
            preview = (item.question[:200] + '...') if len(item.question) > 200 else item.question
            ans_lines.append(f"질문 미리보기: {preview}")
            ans_lines.append("")
            ans_lines.append(f"정답: {item.answer}")
            answer_content = "\n".join(ans_lines)
            # 답안 경계 구분선 추가
            answer_content = answer_content + "\n\n---\n\n"
            answers_for_file.append({
                "title": f"답안 {idx}",
                "content": answer_content
            })

        # --- qg_questions.json 저장 (note-ready 형식) ---
        output_q_filename = "qg_questions.json"
        # --- qg_answers.json 저장 (note-ready 형식) ---
        output_a_filename = "qg_answers.json"

        async def _write_json_file(path: str, obj: Any):
            loop = asyncio.get_event_loop()
            def _sync_write():
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(obj, f, ensure_ascii=False, indent=4)
            try:
                await loop.run_in_executor(None, _sync_write)
                return True
            except Exception as e:
                print(f"[ERROR] 파일 저장 실패 ({path}): {e}")
                return False

        # 비동기(스레드 풀)로 파일 쓰기
        write_q_ok = await _write_json_file(output_q_filename, {"notes": questions_for_file})
        if write_q_ok:
            print(f"[INFO] 문제 파일이 '{output_q_filename}'에 저장되었습니다.")

        write_a_ok = await _write_json_file(output_a_filename, {"notes": answers_for_file})
        if write_a_ok:
            print(f"[INFO] 답안 파일이 '{output_a_filename}'에 저장되었습니다.")
            
        # Pydantic 모델 리스트를 반환합니다. (API 응답 형식은 QuestionItem을 유지)
        return question_items

    except json.JSONDecodeError as e:
        print(f"JSON 파싱 오류: {e}\n원본 출력:\n{raw_json_output}")
        raise ValueError(f"LLM 출력 JSON 파싱 실패: {raw_json_output[:100]}...")
    except Exception as e:
        print(f"최종 데이터 처리 오류: {e}")
        raise
