"use client";

import { useState, useRef, Suspense, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  CameraControls,
  Environment,
  ContactShadows,
  KeyboardControls,
  useGLTF,
  axesHelper,
  useKeyboardControls,
} from "@react-three/drei";


const PRIZES = [
  { name: "熊熊娃娃", icon: "🧸" },
  { name: "棒棒糖", icon: "🍭" },
  { name: "小鴨鴨", icon: "🦆" }
];
const FAIL = { name: "沒抓到", icon: "💦" };


function ClawModel({ clawPos, targetY, setClawPos }) {
  const { scene } = useGLTF("/claw.glb");
  const clawRef = useRef();

  useFrame(() => {
    
    if (Math.abs(clawPos.y - targetY) > 0.01) {
      const newY = clawPos.y + (targetY - clawPos.y) * 0.06;
      setClawPos((pos) => ({ ...pos, y: newY }));
    } else if (clawPos.y !== targetY) {
      setClawPos((pos) => ({ ...pos, y: targetY }));
    }

    if (!clawRef.current) return;
    clawRef.current.traverse((child) => {
      switch (child.name) {
        case "claw":
          child.position.set(clawPos.x, clawPos.y + 2.85, clawPos.z);
          break;
        case "clawBase":
          child.position.set(clawPos.x, 2.85, clawPos.z);
          break;
        case "track":
          child.position.set(0, 2.85, clawPos.z);
          break;
      }
    });
  });

  return <primitive ref={clawRef} object={scene} scale={0.6} />;
}


function ClawCamera({ clawPos, setClawPos }) {
  const [, getKeys] = useKeyboardControls();

  useFrame(() => {
    const keys = getKeys();
    let { x, y, z } = clawPos;
    let moved = false;

    if (keys.forward) {
      z -= 0.05;
      moved = true;
    }
    if (keys.backward) {
      z += 0.05;
      moved = true;
    }
    if (keys.left) {
      x -= 0.05;
      moved = true;
    }
    if (keys.right) {
      x += 0.05;
      moved = true;
    }
    
    x = Math.max(-0.7, Math.min(0.7, x));
    z = Math.max(-0.7, Math.min(0.4, z));

    if (moved) setClawPos((prev) => ({ ...prev, x, z }));
  });

  return null;
}

function Popup({ prize }) {
  if (!prize) return null;
  if (prize.done) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="bg-black/70 text-white px-8 py-6 rounded-lg text-xl shadow-lg flex flex-col items-center">
        <span style={{ fontSize: 48 }}>{prize.icon}</span>
        <span className="mt-2">{prize.name}</span>
      </div>
    </div>
  );
}

function Instructions() {
  return (
    <div className="absolute top-4 right-4 max-w-xs bg-white/90 backdrop-blur-sm p-3 rounded-lg text-sm leading-relaxed shadow-md z-50">
      <p className="font-semibold mb-1">🎮 遊戲玩法</p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          使用 <span className="font-semibold">W/A/S/D</span> 或方向鍵移動爪子
        </li>
        <li>
          按 <span className="font-semibold">Space</span> 下降抓娃娃
        </li>
        <li>
          隨機獲得不同獎品🧸🍭🦆
        </li>
      </ul>
    </div>
  );
}

export default function Home() {
  const [clawPos, setClawPos] = useState({ x: 0, y: 0, z: 0 });
  const [targetY, setTargetY] = useState(0); 
  const [isClawMoving, setIsClawMoving] = useState(false);
  const [popupPrize, setPopupPrize] = useState(null);

 
  const isClawMovingRef = useRef(false);
  useEffect(() => { isClawMovingRef.current = isClawMoving; }, [isClawMoving]);

  function getRandomPrize() {
    const r = Math.random();
    if (r < 0.4) return FAIL;
    if (r < 0.6) return PRIZES[0];
    if (r < 0.8) return PRIZES[1];
    return PRIZES[2];
  }

  
  const handleGrabAttempt = () => {
    if (isClawMovingRef.current) return;
    setIsClawMoving(true);
    setTargetY(-1); 
    setTimeout(() => {
      setTargetY(0); 
      setTimeout(() => {
        setIsClawMoving(false);
        const prize = getRandomPrize();
        setPopupPrize(prize);
      }, 1500); 
    }, 1500); 
  };

  useEffect(() => {
    const listener = (e) => {
      if (e.code === "Space" && !isClawMovingRef.current) {
        e.preventDefault();
        handleGrabAttempt();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (!popupPrize) return;
    const t = setTimeout(() => setPopupPrize(null), 2000);
    return () => clearTimeout(t);
  }, [popupPrize]);

  return (
    <div
      className="w-full h-screen relative bg-center bg-cover"
      style={{ backgroundImage: "url('/arcade-bg.png')" }}
    >
      <Popup prize={popupPrize} />
      <Instructions />


      <KeyboardControls
        map={[
          { name: "forward", keys: ["ArrowUp", "w", "W"] },
          { name: "backward", keys: ["ArrowDown", "s", "S"] },
          { name: "left", keys: ["ArrowLeft", "a", "A"] },
          { name: "right", keys: ["ArrowRight", "d", "D"] },
          { name: "jump", keys: ["Space"] },
        ]}
      >
        <Canvas
          className="absolute inset-0"
          gl={{ alpha: true }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <ambientLight intensity={Math.PI / 2} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={Math.PI} />
          <pointLight position={[-10, -10, -10]} intensity={Math.PI} />

          <group position={[0, -1.5, 0]}>
            <Suspense fallback={null}>
              <ClawModel clawPos={clawPos} targetY={targetY} setClawPos={setClawPos} />
            </Suspense>
          </group>

          <Environment background={false} preset="city" />
          <ContactShadows opacity={1} scale={10} blur={10} color="#DDDDDD" />

          <ClawCamera
            clawPos={clawPos}
            setClawPos={setClawPos}
          />
          <CameraControls />
          <axesHelper args={[10]} />
        </Canvas>
      </KeyboardControls>
    </div>
  );
}
