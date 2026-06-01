"use client";

import Particles from "react-tsparticles";
// use loadFull from tsparticles to avoid missing tsparticles-slim module
import { loadFull } from "tsparticles";
import { useCallback } from "react";

export default function ParticleBackground() {

const particlesInit = useCallback(async (engine:any) => {
    await loadFull(engine);
}, []);

return (

<Particles
init={particlesInit}

options={{
background:{
color:"transparent"
},

fpsLimit:60,

particles:{

number:{
value:70
},

color:{
value:"#ffffff"
},

opacity:{
value:0.28
},

size:{
value:{
min:1,
max:2
}
},

move:{
enable:true,
speed:0.8
},

links:{
enable:true,
distance:170,
opacity:0.16,
color:"#ffffff"
}

},

interactivity:{
events:{
onHover:{
enable:false
}
}
}

}}
/>

)

}