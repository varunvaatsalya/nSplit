import React from "react";

export function Logo({ className = "h-6 w-6 text-primary", ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 698 513"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M346 142 L269 74 C251 59 232 56 213 60 C193 64 177 78 166 96 C160 106 158 117 158 126 L158 407 C158 430 169 450 188 462 C204 472 225 477 243 472 C255 469 265 463 272 457 L347 393 L420 456 C437 471 458 477 477 473 C498 469 515 455 526 437 C531 428 533 417 533 407 L533 126 C533 103 522 83 503 71 C487 61 466 56 448 61 C436 64 426 70 419 76 L346 140 M346 142 L439 223 C450 233 455 247 455 261 C455 278 451 292 442 307 C436 317 427 325 418 329 L347 268 L347 391 L253 311 C243 302 238 290 238 276 C238 260 242 245 250 231 C256 221 265 212 274 205 L346 265 Z"
      />
    </svg>
  );
}
