import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white mt-auto" style={{ borderTop: '12px solid transparent', borderImage: 'linear-gradient(90deg, #857AD2 0%, #B1475C 100%) 1' }}>
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px] py-12 sm:py-16 lg:py-20" style={{ maxWidth: '1440px', width: '100%' }}>
        <div className="flex flex-col mx-auto gap-8 sm:gap-12 lg:gap-12" style={{ maxWidth: '1240px', width: '100%' }}>
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" style={{ width: '100%' }}>
          {/* Logo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Image
                src="/logo.svg"
                alt="PRAKTIK-AI Logo"
                width={81}
                height={83}
                className="w-[50px] h-[52px] sm:w-[65px] sm:h-[67px] lg:w-[81px] lg:h-[83px]"
              />
              <span className="text-lg sm:text-xl font-bold text-black">PRAKTIK-AI</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Navigace</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/" className="hover:text-gray-900 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/moje-kurzy" className="hover:text-gray-900 transition-colors">
                  Moje kurzy
                </Link>
              </li>
              <li>
                <Link href="/odmeny" className="hover:text-gray-900 transition-colors">
                  Odměny
                </Link>
              </li>
              <li>
                <Link href="/tutor" className="hover:text-gray-900 transition-colors">
                  Tutor
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4 hidden">
            <h3 className="font-semibold text-gray-900">Sociální media</h3>
            <div className="flex gap-4">
              {/* Reserved: Facebook, Instagram, YouTube, LinkedIn */}
            </div>
          </div>

          {/* University Logos */}
          <div className="flex flex-col gap-4 sm:gap-[18px]">
            <div className="flex flex-col gap-4 sm:gap-[18px]">
              <Image 
                src="/ujeplogo.svg" 
                alt="UJEP Logo" 
                width={150} 
                height={73}
                className="w-auto h-auto max-w-[100px] sm:max-w-[120px] lg:max-w-[150px]"
              />
              <Image 
                src="/ostravskalogo.svg" 
                alt="Ostravská univerzita Logo" 
                width={150} 
                height={73}
                className="w-auto h-auto max-w-[100px] sm:max-w-[120px] lg:max-w-[150px]"
              />
              <Image 
                src="/tacrlogowide.svg" 
                alt="TAČR Logo" 
                width={150} 
                height={73}
                className="w-auto h-auto max-w-[100px] sm:max-w-[120px] lg:max-w-[150px]"
              />
            </div>
          </div>
          </div>

        {/* Copyright */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2" style={{ width: '100%', minHeight: '24px' }}>
          <p className="text-sm text-gray-500">
            © {currentYear} All rights reserved
          </p>
          <Link
            href="/ochrana-udaju"
            className="text-sm text-gray-600 underline hover:text-gray-900 transition-colors"
          >
            Ochrana údajů
          </Link>
        </div>
        </div>
      </div>
    </footer>
  );
}
