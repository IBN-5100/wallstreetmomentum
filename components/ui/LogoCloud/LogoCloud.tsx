export default function LogoCloud() {
  return (
    <div>
      <p className="mt-24 text-xs uppercase text-zinc-400 text-center font-bold tracking-[0.3em]">
        In partnership with
      </p>
      <div className="grid grid-cols-1 place-items-center sm:mt-12 sm:space-y-10  sm:grid-cols-1">
        <div className="flex items-center justify-start h-12">
          <a href="https://rebellionstrategies.com" aria-label="Rebellion Strategies">
            <img
              src="/rebstrat.png"
              alt="RebStrat Logo"
              className="h-6 sm:h-12 text-white"
            />
          </a>
        </div>
        <div className="flex items-center justify-start h-12">
          <a href="https://sficucsd.com" aria-label="SFIC UCSD">
            <img
              src="/sficucsd.png"
              alt="SFIC UCSD Logo"
              className=" text-white"
            />
          </a>
        </div>
        
      </div>
    </div>
  );
}
