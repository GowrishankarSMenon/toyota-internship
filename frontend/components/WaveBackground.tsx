"use client";

export default function WaveBackground() {

return (

<div className="absolute inset-0 overflow-hidden pointer-events-none">

<svg
className="
absolute
bottom-[-10%]
left-0
w-full
h-full
opacity-30
animate-wave
"

viewBox="0 0 1600 800"
>

<path
fill="none"
stroke="white"
strokeWidth="1"

d="
M0,500
C300,350
500,700
800,500
C1100,300
1300,650
1600,450
"
/>

<path
fill="none"
stroke="white"
strokeWidth="0.5"

d="
M0,550
C300,420
500,750
800,550
C1100,350
1300,720
1600,500
"
/>

</svg>

</div>

)

}