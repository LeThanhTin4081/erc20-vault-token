export function AppBackdrop() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 bg-black" />
    </>
  );
}

export function AppLoader() {
  return (
    <div className="app-loader fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5">
        <div className="app-loader__orb" />
        <div className="text-center">
          <p className="text-sm font-semibold text-violet-100">
            Loading VaultToken
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Preparing interface...
          </p>
        </div>
      </div>
    </div>
  );
}
