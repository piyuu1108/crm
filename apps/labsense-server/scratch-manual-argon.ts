import { hash, verify } from '@node-rs/argon2';

async function test() {
    const password = "piyu-o-shoneya-menu-nayi-jina-tere-bina";
    
    // Using the same config as auth.ts
    const h = await hash(password, {
        algorithm: 2, 
        timeCost: 2, 
        memoryCost: 32768, 
        parallelism: 1,
        outputLen: 32 
    });
    console.log("Hash:", h);
    
    const v = await verify(h, password);
    console.log("Verify plain:", v);
    
    const v2 = await verify(h, password, {
        algorithm: 2, 
        timeCost: 2, 
        memoryCost: 32768, 
        parallelism: 1,
        outputLen: 32 
    });
    console.log("Verify with options:", v2);
}

test();
