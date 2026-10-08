/** Theme-aware wordmark; both images ship, CSS shows the one matching the theme */
export function BrandLogo({ className = "h-10" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/fameowly.svg" alt="Fameowly" width={343} height={71} className={`hidden w-auto select-none dark:block ${className}`} draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/fameowly-light.svg" alt="Fameowly" width={343} height={71} className={`block w-auto select-none dark:hidden ${className}`} draggable={false} />
    </>
  );
}
