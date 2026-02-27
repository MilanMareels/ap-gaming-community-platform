import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen pt-20 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-linear-to-b from-gray-200 to-slate-950" />

      <div className="container mx-auto px-4 z-10 text-center">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6">
          <span className="text-red-600">AP</span> GAMING HUB
        </h1>
        <div className="flex justify-center gap-4">
          <Link href="/reservations" className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold transition-all">
            Reserveer
          </Link>
          <Link href="/schedule" className="bg-slate-800 border border-slate-700 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-700">
            Openingsuren
          </Link>
        </div>
      </div>
    </div>
  );
}
