"use client";

import { useState, useRef, Suspense, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  RoundedBox,
  CameraControls,
  Environment,
  ContactShadows,
  KeyboardControls,
  useGLTF,
  axesHelper,
} from "@react-three/drei";
import ClawCamera from "@/component/ClawCamera";

/* ---------------- 爪子模型 ---------------- */
function ClawModel({ clawPos }) {
  const { scene } = useGLTF("/claw.glb");
  const clawRef = useRef();

  useFrame(() => {
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

/* ---------------- 彈窗 ---------------- */
function Popup({ text }) {
  if (!text) return null;
  if (text.includes("任務完成")) return null; // 🛠️ 避免任務完成重複顯示在彈窗
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="bg-black/70 text-white px-8 py-4 rounded-lg text-xl shadow-lg">
        {text}
      </div>
    </div>
  );
}

/* ---------------- 遊戲說明 ---------------- */
function Instructions() {
  return (
    <div className="absolute top-4 right-4 max-w-xs bg-white/90 backdrop-blur-sm p-3 rounded-lg text-sm leading-relaxed shadow-md z-50">
      <p className="font-semibold mb-1">🎮 遊戲玩法</p>
      <ul className="list-disc list-inside space-y-1">
        <li>使用 <span className="font-semibold">W/A/S/D</span> 或方向鍵移動爪子。</li>
        <li>按 <span className="font-semibold">Space</span> 下降抓娃娃。</li>
        <li>每次抓取有 50% 機率成功。</li>
        <li>成功 <span className="font-semibold">3 次</span> 即過關！</li>
      </ul>
    </div>
  );
}

/* ---------------- 主頁面 ---------------- */
export default function Home() {
  /* 基本狀態 */
  const [clawPos, setClawPos] = useState({ x: 0, y: 0, z: 0 });
  const [isClawDown, setIsClawDown] = useState(false);
  const [popup, setPopup] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const gameOverRef = useRef(false);
  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  const handleGrabAttempt = () => {
    if (gameOverRef.current) return;
    setIsClawDown(false);
    setTimeout(() => {
      const success = Math.random() < 0.5;
      setPopup(success ? "抓到了！🎉" : "沒抓到，再試一次！");
      setAttemptCount((c) => c + 1);
      if (success) setSuccessCount((c) => c + 1);
    }, 1000);
  };

  useEffect(() => {
    const listener = (e) => {
      if (e.code === "Space" && !gameOverRef.current) {
        e.preventDefault();
        setIsClawDown(true);
        handleGrabAttempt();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    if (!popup) return;
    const t = setTimeout(() => setPopup(""), 2000);
    return () => clearTimeout(t);
  }, [popup]);

  useEffect(() => {
    if (successCount >= 3) {
      setGameOver(true);
    }
  }, [successCount]);

  const handleRestart = () => {
    setSuccessCount(0);
    setAttemptCount(0);
    setGameOver(false);
    setPopup("");
  };

  const isHidden = true;

  return (
    <div
      className="w-full h-screen relative bg-center bg-cover"
      style={{ backgroundImage: "url('/arcade-bg.png')" }}
    >
      <Popup text={popup} />
      <Instructions />

      <div className="absolute top-4 left-4 bg-white/80 p-2 rounded text-sm z-50">
        抓取次數：{attemptCount} / 成功：{successCount}
      </div>

      {gameOver && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50 text-white text-center space-y-4">
          <div className="text-2xl font-bold">🎉 任務完成！</div>
          <div>你成功抓到了 3 次娃娃！</div>
          <button
            onClick={handleRestart}
            className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-lg"
          >
            重新開始遊戲
          </button>
        </div>
      )}

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

          {!isHidden && (
            <RoundedBox args={[1, 1, 1]} radius={0.05} smoothness={4}>
              <meshPhongMaterial color="#f3f3f3" />
            </RoundedBox>
          )}

          <Suspense fallback={null}>
            <ClawModel clawPos={clawPos} />
          </Suspense>

          <Environment background={false} preset="city" />
          <ContactShadows opacity={1} scale={10} blur={10} color="#DDDDDD" />

          <ClawCamera
            clawPos={clawPos}
            setClawPos={setClawPos}
            isClawDown={isClawDown}
            setIsClawDown={setIsClawDown}
          />
          <CameraControls />
          <axesHelper args={[10]} />
        </Canvas>
      </KeyboardControls>
    </div>
  );
}
