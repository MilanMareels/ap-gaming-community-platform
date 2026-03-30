'use client';

import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ShieldAlert, Terminal, Cpu, Users, Gamepad2, Zap, Lock, MessageCircle, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/api';

const FAQS = [
  {
    question: 'Hoe reserveer ik een plaats?',
    answer:
      "Ga via het menu naar de pagina 'Reservaties'. Vul je studentennummer en AP-e-mailadres in, kies of je een pc of PS5 wilt gebruiken en selecteer een beschikbaar tijdslot.",
  },
  {
    question: 'Wat als ik niet kom opdagen bij mijn reservatie?',
    answer:
      'Ben je verhinderd? Annuleer dan op tijd via Discord of e-mail. Bij een no-show zonder afmelding krijg je een waarschuwing. Bij herhaling kan je account tijdelijk geblokkeerd worden.',
  },
  {
    question: "Welke PC's zijn er?",
    answer:
      "Onze e-sportsruimte beschikt over high-end gaming-pc's met krachtige RTX 50-serie videokaarten en snelle processors, gekoppeld aan 180Hz-monitoren voor competitieve gameplay.",
  },
  {
    question: 'Welke games mag ik spelen?',
    answer:
      'Je mag alle vooraf geïnstalleerde games spelen (o.a. Valorant, LoL, CS2, Overwatch 2). Het installeren van eigen software of illegale content is streng verboden.',
  },
  {
    question: 'Hoelang mag ik huren en blijven gamen?',
    answer:
      'Je kan maximaal 4 uur per dag reserveren. Deze limiet zorgt ervoor dat zo veel mogelijk studenten gebruik kunnen maken van de faciliteiten.',
  },
  {
    question: 'Kan ik ook op de PS5 of Nintendo Switch spelen?',
    answer:
      "Zeker! Naast de PC's hebben we consoles met populaire titels. Voor PS5 hebben we o.a. FC 26, Elden Ring en Gran Turismo 7. Voor de Switch zijn er partygames zoals Mario Kart 8 en Super Smash Bros Ultimate.",
  },
  {
    question: "Hoe werken de 'Fysieke' games in de lijst?",
    answer:
      "Games die als 'fysiek' aangeduid staan (vooral op Switch en bij sommige PS5-titels) haal je op bij de beheerder. We vragen meestal je studentenkaart als tijdelijk onderpand.",
  },
];

export default function InfoPage() {
  const [activeTab, setActiveTab] = useState('conduct');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [formUrl, setFormUrl] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.GET('/settings/public');
        if (res.data) {
          const settings = res.data;
          const formSetting = settings.find((s) => s.key === 'googleFormUrl');
          if (formSetting) setFormUrl(formSetting.value);
        }
      } catch {
        // ignore
      }
    };
    fetchSettings();
  }, []);

  const tabs = [
    { id: 'conduct', label: 'Gedragscode', icon: Users },
    { id: 'hardware', label: 'Hardwareregels', icon: Cpu },
    { id: 'general', label: 'Algemene regels', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen py-24 px-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[#d42422] rounded-full blur-[150px] opacity-10 pointer-events-none mix-blend-screen"></div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <ScrollReveal direction="up">
          <div className="mb-16 flex flex-col items-center">
            <div className="inline-flex items-center justify-center p-4 bg-white/5 rounded-full mb-6 border border-white/10">
              <Terminal size={48} className="text-[#d42422]" />
            </div>
            <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter text-white uppercase text-center drop-shadow-lg">
              HUB <span className="text-[#d42422]">PROTOCOLS</span>
            </h1>
            <p className="text-[#d42422] tracking-[0.4em] font-bold text-sm mt-4 uppercase">// Verplichte lectuur voor alle studenten</p>
          </div>
        </ScrollReveal>

        <div className="flex flex-col lg:flex-row gap-8 mb-20">
          <div className="w-full lg:w-1/3 space-y-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-4 p-6 rounded-2xl border-2 transition-all duration-300 font-bold uppercase tracking-wider text-left ${isActive ? 'bg-[#d42422] border-[#d42422] text-white shadow-[0_0_30px_rgba(212,36,34,0.3)] scale-105' : 'bg-[#0a0f25] border-white/10 text-gray-500 hover:text-white hover:border-white/30'}`}
                >
                  <Icon size={24} className={isActive ? 'text-white' : 'text-[#d42422]'} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="w-full lg:w-2/3 bg-[#0a0f25] border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Terminal size={200} />
            </div>

            {activeTab === 'conduct' && (
              <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl md:text-4xl font-black italic text-white uppercase mb-8 border-b border-white/10 pb-4">Gedragscode</h2>
                <div className="space-y-6 text-gray-400 leading-relaxed font-medium">
                  <p>
                    We respecteren elkaar, de apparatuur en de ruimte. AP Gaming Hub is een veilige en inclusieve omgeving voor iedereen. Racisme,
                    seksisme, homofobie of andere vormen van discriminatie worden <span className="text-[#d42422]">niet getolereerd</span>.
                  </p>

                  <div className="bg-black/40 p-6 rounded-xl border-l-4 border-[#d42422]">
                    <h4 className="text-white font-bold mb-2 uppercase tracking-widest">// Gouden regel</h4>
                    <p>Behandel anderen zoals je zelf behandeld wilt worden. Respect staat altijd op één.</p>
                  </div>

                  <ul className="space-y-4 mt-6 list-none">
                    <li className="flex items-start gap-4">
                      <span className="text-[#d42422] font-black">01.</span>
                      <span>Ruim je eigen rommel op. Laat de setup achter zoals je hem aantrof.</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="text-[#d42422] font-black">02.</span>
                      <span>Houd het volume op een aanvaardbaar niveau. Gebruik een headset voor in-game communicatie.</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="text-[#d42422] font-black">03.</span>
                      <span>Geen eten of drinken direct naast of boven de randapparatuur.</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="text-[#d42422] font-black">04.</span>
                      <span>Bij conflicten of overlast contacteer je meteen een beheerder.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'hardware' && (
              <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl md:text-4xl font-black italic text-white uppercase mb-8 border-b border-white/10 pb-4">Hardwareregels</h2>
                <div className="space-y-6 text-gray-400 font-medium">
                  <p>Onze setups zijn high-end. Behandel ze met uiterste zorg. Elke setup is ter waarde van €3.000+.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="bg-white/5 p-6 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
                      <Cpu className="text-[#d42422] mb-4" size={32} />
                      <h4 className="text-white font-bold mb-2 uppercase tracking-widest">Geen aanpassingen</h4>
                      <p className="text-sm">
                        Installeer geen eigen software zonder toestemming van een beheerder. Geen USB-sticks; alleen APG-goedgekeurde opslagmedia.
                      </p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
                      <ShieldAlert className="text-[#d42422] mb-4" size={32} />
                      <h4 className="text-white font-bold mb-2 uppercase tracking-widest">Defecten melden</h4>
                      <p className="text-sm">
                        Meld defecte apparatuur onmiddellijk. Probeer niets zelf te repareren, anders kan je account geblokkeerd worden.
                      </p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
                      <Lock className="text-[#d42422] mb-4" size={32} />
                      <h4 className="text-white font-bold mb-2 uppercase tracking-widest">Accountveiligheid</h4>
                      <p className="text-sm">Deel je account niet en log altijd uit na je sessie.</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
                      <Gamepad2 className="text-[#d42422] mb-4" size={32} />
                      <h4 className="text-white font-bold mb-2 uppercase tracking-widest">Randapparatuur</h4>
                      <p className="text-sm">
                        Gebruik de randapparatuur zoals bedoeld. Geen agressief gedrag richting muis, toetsenbord of controllers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl md:text-4xl font-black italic text-white uppercase mb-8 border-b border-white/10 pb-4">Algemene regels</h2>
                <div className="space-y-6 text-gray-400 font-medium">
                  <p className="italic text-gray-300">Algemene richtlijnen voor toegang tot en gebruik van de AP Gaming Hub.</p>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4 bg-black/30 p-4 rounded-lg border border-white/5 hover:border-[#d42422]/50 transition-colors">
                      <ShieldAlert className="text-[#d42422] mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-white mb-1">Openingsuren</p>
                        <p>
                          De hub is alleen toegankelijk tijdens de aangegeven openingsuren of met een geldige reservatie. Zie het rooster op de
                          website.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 bg-black/30 p-4 rounded-lg border border-white/5 hover:border-[#d42422]/50 transition-colors">
                      <Users className="text-[#d42422] mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-white mb-1">Studentenkaart verplicht</p>
                        <p>
                          Een geldige studentenkaart is verplicht. Alleen AP-studenten kunnen lid worden. Toon je kaart bij binnenkomst aan de
                          beheerder.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 bg-black/30 p-4 rounded-lg border border-white/5 hover:border-[#d42422]/50 transition-colors">
                      <Zap className="text-[#d42422] mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-white mb-1">Maximale sessieduur</p>
                        <p>Maximaal 4 uur per dag. Dit zorgt ervoor dat meer studenten van de faciliteiten kunnen genieten.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 bg-black/30 p-4 rounded-lg border border-white/5 hover:border-[#d42422]/50 transition-colors">
                      <Lock className="text-[#d42422] mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-bold text-white mb-1">Sancties</p>
                        <p>
                          No-shows, beschadigde apparatuur of gedragsproblemen kunnen leiden tot een tijdelijke blokkering. Bij herhaling kan een
                          permanent verbod volgen.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Community & Resources Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20 pt-8 max-w-4xl mx-auto">
          <ScrollReveal direction="left">
            <div className="h-full bg-[#0a0f25] border border-white/10 p-8 rounded-[1.5rem] flex flex-col items-center text-center hover:border-[#d42422]/60 transition-all relative overflow-hidden group">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#d42422] rounded-full blur-[70px] opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"></div>
              <MessageCircle size={42} className="text-[#d42422] mb-5" strokeWidth={1.5} />
              <h2 className="text-2xl font-bold italic uppercase mb-3 text-white tracking-wider">Word lid van Discord</h2>
              <p className="text-gray-400 mb-7 text-base font-medium">Chat met andere studenten, vind teammates en blijf op de hoogte van events.</p>
              <a
                href="https://discord.gg/FGCC9GTetC"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#d42422] hover:bg-[#ff3333] text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-sm transition-all hover:shadow-[0_0_20px_rgba(212,36,34,0.5)]"
              >
                Open Discord
              </a>
            </div>
          </ScrollReveal>

          {formUrl && (
            <ScrollReveal direction="right">
              <div className="h-full bg-gradient-to-br from-[#d42422] to-[#990000] p-8 rounded-[1.5rem] flex flex-col items-center text-center hover:scale-[1.01] transition-transform relative overflow-hidden group">
                <div className="absolute -left-10 -top-10 w-40 h-40 bg-white rounded-full blur-[70px] opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"></div>
                <ClipboardList size={42} className="text-white mb-5" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold italic uppercase mb-3 text-white tracking-wider">Aanvraag / Feedback</h2>
                <p className="text-white/90 mb-7 text-base font-medium">Suggesties of hulp nodig? Dien een formulier in voor de beheerders.</p>
                <a
                  href={formUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#d42422] px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-sm hover:shadow-lg transition-shadow"
                >
                  Open formulier
                </a>
              </div>
            </ScrollReveal>
          )}
        </div>

        {/* FAQ Section */}
        <ScrollReveal direction="up">
          <div className="mt-20 pt-20 border-t border-white/10">
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase text-center mb-16">
              Veelgestelde <span className="text-[#d42422]">vragen</span>
            </h2>
            <div className="max-w-4xl mx-auto space-y-4">
              {FAQS.map((faq, index) => (
                <div key={index} className="bg-[#0a0f25] border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-[#d42422]/50">
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left font-semibold text-lg hover:bg-white/5 transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="pr-8">{faq.question}</span>
                    {openIndex === index ? (
                      <ChevronUp className="text-[#d42422] shrink-0" strokeWidth={2} />
                    ) : (
                      <ChevronDown className="text-gray-400 shrink-0" strokeWidth={2} />
                    )}
                  </button>
                  <div
                    className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                      openIndex === index ? 'max-h-96 py-4 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="text-gray-400 text-lg leading-relaxed border-t border-white/10 pt-4">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
