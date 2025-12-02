import Link from "next/link";
import { Button } from "@/components/ui";

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
            <Link href="/courses">
              <button 
                className="text-white font-semibold rounded-md shadow-lg transition-colors px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base"
                style={{ backgroundColor: '#00C896' }}
              >
                Začít kurz
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
