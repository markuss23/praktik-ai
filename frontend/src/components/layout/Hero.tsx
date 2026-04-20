export function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: '#F0F0F0', paddingTop: '48px', paddingBottom: '48px' }}>
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px]" style={{ maxWidth: '1440px', width: '100%' }}>
        <div 
          className="relative overflow-hidden"
          style={{ 
            background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.9) 0%, #3C3C3C 100%)',
            width: '100%',
            maxWidth: '1240px',
            height: 'auto',
            minHeight: '423px',
            paddingTop: '64px',
            paddingRight: '100px',
            paddingBottom: '64px',
            paddingLeft: '100px',
            borderRadius: '24px'
          }}
        >
          {/* Decorative gradient ellipses */}
          <div 
            className="absolute rounded-full blur-3xl"
            style={{ 
              background: 'linear-gradient(135deg, #B1475C 0%, #857AD2 100%)',
              width: '300px',
              height: '300px',
              top: '-100px',
              right: '-50px',
              opacity: 0.6
            }}
          ></div>
          <div 
            className="absolute rounded-full blur-3xl"
            style={{ 
              background: 'linear-gradient(135deg, #857AD2 0%, #B1475C 100%)',
              width: '300px',
              height: '300px',
              bottom: '-100px',
              left: '-50px',
              opacity: 0.5
            }}
          ></div>
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8 leading-tight">
              Připravujeme budoucí učitele pro digitální éru
            </h1>
            <div className="flex flex-wrap gap-4">
            <div className="mt-8 bg-[#252323]/80 backdrop-blur-sm border border-white/10 rounded-xl p-5 sm:p-6 shadow-2xl flex items-start sm:items-center gap-4 sm:gap-5 max-w-xl transition-all hover:bg-[#252323]">
              
              <div className="flex-shrink-0 p-3 rounded-full shadow-lg" style={{ background: 'linear-gradient(135deg, #857AD2 0%, #B1475C 100%)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-300 text-sm sm:text-base font-medium mb-1">
                  Máte nějaké připomínky? Napište nám:
                </p>
                <a 
                  href="mailto:praktikai@ujep.cz" 
                  className="text-lg sm:text-xl font-bold text-white hover:text-[#857AD2] transition-colors underline decoration-white/30 underline-offset-4 hover:decoration-[#857AD2]"
                >
                  praktikai@ujep.cz
                </a>
              </div>
              
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
