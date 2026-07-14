export default function MarketingLoading() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        background: "linear-gradient(90deg, #6fe0f5, #ffb3c6)",
        zIndex: 200,
        animation: "marketing-loading-bar 1s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes marketing-loading-bar {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
