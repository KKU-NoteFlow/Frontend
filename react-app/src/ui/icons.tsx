import React from 'react'

type IconProps = Omit<React.SVGProps<SVGSVGElement>, 'stroke' | 'strokeWidth' | 'size'> & {
  size?: number
  strokeWidth?: number
}

const makeIcon = (paths: React.ReactNode) => ({ size = 20, strokeWidth: sw = 1.8, ...rest }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...rest}
  >
    {paths}
  </svg>
)

export const IconMic = makeIcon(<>
  <path d="M12 1.75a3.25 3.25 0 0 0-3.25 3.25v6a3.25 3.25 0 1 0 6.5 0v-6A3.25 3.25 0 0 0 12 1.75z"/>
  <path d="M5 11.5a7 7 0 0 0 14 0"/>
  <path d="M12 18.5v3"/>
  <path d="M8.5 21.5h7"/>
 </>)

export const IconBrain = makeIcon(<>
  <path d="M8 8a3 3 0 0 1 0-6 3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6.5a3 3 0 0 1 0-6H8"/>
  <path d="M16 8a3 3 0 0 0 0-6 3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h1.5a3 3 0 0 0 0-6H16"/>
 </>)

export const IconUpload = makeIcon(<>
  <path d="M12 16V4"/>
  <path d="M8 8l4-4 4 4"/>
  <path d="M4 20h16"/>
 </>)

export const IconTextRecognition = makeIcon(<>
  <rect x="3" y="4" width="18" height="16" rx="2"/>
  <path d="M7 8h10"/>
  <path d="M7 12h6"/>
  <path d="M7 16h4"/>
 </>)

export const IconStar = makeIcon(<>
  <path d="M12 17.3 7.1 20l1-5.8L4 9.8l5.9-.9L12 3.5l2.1 5.4 5.9.9-4.1 4.4 1 5.8z"/>
 </>)

export const IconDots = makeIcon(<>
  <circle cx="5" cy="12" r="1.5"/>
  <circle cx="12" cy="12" r="1.5"/>
  <circle cx="19" cy="12" r="1.5"/>
 </>)

export const IconSearch = makeIcon(<>
  <circle cx="11" cy="11" r="6"/>
  <path d="M20 20l-3.5-3.5"/>
 </>)
