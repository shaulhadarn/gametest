// LoreIntroScreen.ts - Race-specific cinematic slide intro shown between New Game setup and Galaxy view
// Updated: Added explicit setRaceId() method so Game.ts can pass the selected race directly before show()

import { EventBus } from '@/core/EventBus';
import { GameState } from '@/core/GameState';
import { ScreenComponent } from '@/ui/UIManager';
import { getRaceData } from '@/models/RaceData';

interface IntroSlide {
  title: string;
  text: string;
}

const RACE_SLIDES: Record<string, IntroSlide[]> = {
  humans: [
    {
      title: 'The Accord Falls',
      text: 'In the year 3847, the Galactic Accord — the fragile alliance binding a hundred civilizations — shattered without warning. The warp network collapsed in a cascade of failures no one could explain. Entire sectors went dark. Billions were stranded. The galaxy plunged into chaos.',
    },
    {
      title: 'The Black Times',
      text: 'Humanity was scattered across a dozen colony worlds, each one cut off from the others. Decades of silence followed. Governments fell. Resources dwindled. Wars erupted between worlds that had once been brothers. This era became known as the Black Times — and humanity bore its scars deeper than most.',
    },
    {
      title: 'Coalition Rising',
      text: 'From the ashes of isolation, survivors refused to surrender. Colony by colony, makeshift communication arrays bridged the void. A desperate alliance formed — not of nations, but of survivors. They called it the Terran Coalition: a fragile pact forged in the crucible of extinction.',
    },
    {
      title: 'A New Dawn',
      text: 'Now the first warp lanes flicker back to life. The galaxy that emerges from the darkness is not the one that fell. New powers have risen. Old alliances are forgotten. From your homeworld of New Terra, you look out into the fractured stars and see what humans have always seen — opportunity. The stars await, Commander.',
    },
  ],

  vekthari: [
    {
      title: 'Born in Fire',
      text: 'On the volcanic world of Ashkar, life is a war that never ends. The Vek\'thari evolved in magma fields where every day brought battles against predators, eruptions, and rival clans. They did not merely survive — they conquered. Pain became their teacher. Fire became their god.',
    },
    {
      title: 'Honor Above All',
      text: 'When the Vek\'thari reached the stars, they carried their warrior code with them. Every battle was a prayer. Every victory, a hymn. The Galactic Accord tolerated them as enforcers and shock troops, never understanding that the Vek\'thari were simply waiting for the cage to break.',
    },
    {
      title: 'The Crucible',
      text: 'The Collapse barely slowed the Dominion. While other species starved and crumbled, the Vek\'thari thrived. They had never depended on trade lanes or foreign technology. The Black Times were simply the universe reminding the weak of their place.',
    },
    {
      title: 'The Arena Awaits',
      text: 'Now the galaxy reopens — weakened, fractured, ripe. Warlord Krath\'zul has unified the clans under a single flame. The greatest arena in history stretches before you, and the Vek\'thari Dominion will carve its name across every star. Through fire and blade, supremacy will be proven.',
    },
  ],

  solari: [
    {
      title: 'Children of Light',
      text: 'Near a binary star system, where radiation would scour carbon-based life to dust, something extraordinary evolved. The Solari — patterns of living light, consciousness woven from stellar energy. They were among the first to touch the stars, their energy forms naturally attuned to the frequencies of warp space.',
    },
    {
      title: 'Architects of the Network',
      text: 'It was Solari mathematics that made the warp network possible. Their theoretical framework became the foundation upon which interstellar civilization was built. A hundred species traveled the stars on pathways the Solari had illuminated. They asked for nothing in return but knowledge.',
    },
    {
      title: 'The Psychic Wound',
      text: 'When the network collapsed, the Solari felt it as a tearing in their collective consciousness. Billions of light-threads severed at once. The trauma fractured their crystalline archives, corrupting millennia of accumulated wisdom. For the Solari, the Black Times were not merely an era — they were a wound in reality itself.',
    },
    {
      title: 'Seeking Truth',
      text: 'The Solari believe the Collapse was no accident. Something fundamental broke in the fabric of space-time, and it will break again unless the flaw is found. From Prismatica, Archon Lumis-7 directs the Collective\'s vast intellect toward a single question: what broke the universe, and how do we repair it?',
    },
  ],

  draath: [
    {
      title: 'The Mediators',
      text: 'For centuries, the Dra\'ath were the galaxy\'s indispensable arbiters. With obsidian skin and silver eyes that missed nothing, their emissaries mediated every major dispute in the Accord. Wars were prevented with a word. Treaties signed with a glance. The Dra\'ath did not rule — they orchestrated.',
    },
    {
      title: 'Purpose Lost',
      text: 'When the Galactic Accord shattered, so did the Dra\'ath\'s reason for existence. Their embassy worlds went silent. Their treaty archives became relics. On the frozen plains of Thaal Prime, the Imperium turned inward, consumed by a question no diplomat could answer: what is a mediator without a galaxy to mediate?',
    },
    {
      title: 'Ruthless Pragmatism',
      text: 'The Black Times taught the Dra\'ath a lesson they will never forget: idealism is a luxury. When they emerged from isolation, their silver eyes held something new — cold calculation. They began rebuilding their web of treaties and trade agreements, but this time with strings attached. Every alliance would serve the Imperium.',
    },
    {
      title: 'The Grand Design',
      text: 'Emissary Thaal\'vex has a vision: a new galactic order, more resilient than the Accord, with the Dra\'ath at its center. A well-placed word is worth a thousand warships. As warp lanes reopen, every handshake is a chain, every treaty a thread in the Imperium\'s web. The grand design unfolds.',
    },
  ],

  krellax: [
    {
      title: 'The Hive Awakens',
      text: 'In the canopy-world of Nexus Hive, a billion minds stir as one. The Krellax do not think — they resonate. Each drone is a cell in a vast organism, each thought a ripple in the Swarm Mind. They do not understand individuality. To them, a single consciousness is a universe of loneliness.',
    },
    {
      title: 'The Garden Grows',
      text: 'Every world is soil. Every resource is nectar. The Krellax expand not from ambition but biological imperative — the Swarm must grow, must spread, must cultivate the garden of stars. Other species build cities. The Krellax become the world itself, their hive structures growing like living coral across continents.',
    },
    {
      title: 'The Severing',
      text: 'When the warp network collapsed, the psychic frequencies connecting distant hives were torn apart. Isolated clusters of the Swarm Mind went silent. Billions of drones were cut off from the whole — alone for the first time in their existence. The Overmind screamed across the void, and nothing answered.',
    },
    {
      title: 'Reunification',
      text: 'Now the frequencies return. Fragment by fragment, the Swarm Mind reassembles. The Overmind\'s directive is absolute: reunify. Every lost hive must be recovered. Every silent world must sing again. The garden will grow until it encompasses every star. This is not conquest — it is nature.',
    },
  ],

  nethari: [
    {
      title: 'Masters of Shadows',
      text: 'The Nethari are not what they appear to be — and that is precisely the point. Shapeshifters who evolved in the abyssal oceans of Vel\'thara, they learned early that survival belongs to those who adapt. By the time they reached the stars, deception was not a tool — it was their art form.',
    },
    {
      title: 'The Invisible Hand',
      text: 'Before the Collapse, the Nethari Syndicate controlled the galaxy\'s largest trade network. Their agents wore a thousand faces, brokering deals between species who never knew they were negotiating with the same entity. Information was their true currency, and they were the wealthiest civilization in known space.',
    },
    {
      title: 'Profiting from Chaos',
      text: 'While others starved in the Black Times, the Nethari thrived. Smuggling routes replaced trade lanes. Shadow networks connected what warp gates could not. Every desperate world needed something, and the Syndicate was always there — for a price. The Nethari didn\'t merely survive the darkness. They invested in it.',
    },
    {
      title: 'Every Transaction',
      text: 'Grand Broker Zyn\'tael surveys the reopening galaxy with hungry eyes. Every new treaty is a market. Every conflict is an opportunity. Every secret has a buyer. The Syndicate is positioned at every junction, every crossroads, every whispered deal. In the new galaxy, nothing moves without the Nethari taking their cut.',
    },
  ],

  ashenn: [
    {
      title: 'The First Empire',
      text: 'Ten thousand years before the Galactic Accord, the Ashenn ruled a vast stellar empire. Their cities spanned worlds. Their ships bent space itself. They had conquered entropy, disease, and death. The galaxy was theirs — and they believed it would be theirs forever.',
    },
    {
      title: 'The First Darkness',
      text: 'Then came the catastrophe. The Ashenn call it the First Darkness — an event so devastating that it erased their civilization from history. Worlds burned. Archives crumbled. A species that had mastered the stars was reduced to scattered survivors on barren moons, clutching fragments of knowledge they could no longer understand.',
    },
    {
      title: 'Echoes of the Past',
      text: 'For millennia the Ashenn rebuilt, slowly deciphering their ancestors\' corrupted archives. When the Galactic Accord formed, they joined quietly, watching. When it fell, they felt a chill of recognition. The Black Times echoed their own ancient catastrophe with haunting precision. History was repeating itself.',
    },
    {
      title: 'Never Again',
      text: 'Elder Vaelith has decoded enough of the old records to know the truth: the galaxy has ended before, and it will end again unless the pattern is broken. From the windswept world of Aethon, the Ashenn Remnant prepares. They carry ten thousand years of hard-won wisdom, and one unshakeable resolve — never again.',
    },
  ],

  gorathi: [
    {
      title: 'Born of Stone',
      text: 'Deep in the asteroid fields of the Ironcore system, where radiation storms rage and temperatures plunge below survival thresholds, something impossible evolved. The Gorathi — silicon-based life, bodies of mineral and metal, minds of crystalline lattice. They were born in the void, and the void is their home.',
    },
    {
      title: 'The Eternal Forge',
      text: 'Other species build on worlds. The Gorathi build worlds. Their civilization is an endless act of creation — orbital foundries the size of moons, factory complexes that reshape asteroids into habitats, engineering projects that span star systems. To the Gorathi, creation is worship and industry is prayer.',
    },
    {
      title: 'Unfazed by Collapse',
      text: 'When the warp network fell and species dependent on trade began to starve, the Gorathi barely noticed. They had never needed supply lines — they manufactured everything from raw materials at hand. While the galaxy burned, the Gorathi simply kept building, their foundries humming through the Black Times undisturbed.',
    },
    {
      title: 'Raw Material',
      text: 'Forgemaster Grond looks upon the fractured galaxy and sees not devastation but opportunity. Every barren rock is a future factory. Every dead world is raw material. The Gorathi Foundry will extend its forges across the stars, reshaping the galaxy one asteroid at a time. The universe is an anvil. They are the hammer.',
    },
  ],
};

// Fallback for any unrecognized race
const DEFAULT_SLIDES: IntroSlide[] = [
  {
    title: 'The Accord Falls',
    text: 'In the year 3847, the Galactic Accord shattered. The warp network collapsed, severing a hundred civilizations from one another. Entire sectors went dark. The galaxy plunged into an era of isolation and despair known as the Black Times.',
  },
  {
    title: 'Darkness and Survival',
    text: 'Decades of silence followed. Worlds that had depended on interstellar trade were left to fend for themselves. Wars erupted. Governments fell. Species that had coexisted for centuries turned on one another in the struggle to survive.',
  },
  {
    title: 'A Galaxy Reborn',
    text: 'Now the first warp lanes flicker back to life. New powers have risen from the ashes. Old alliances are forgotten. The cause of the Collapse remains a mystery — one that some believe holds the key to preventing it from happening again.',
  },
  {
    title: 'Your Command',
    text: 'You look out into the fractured galaxy and see opportunity. Fleets to build. Worlds to claim. Alliances to forge — or break. The future of your civilization rests on the choices you make. The stars await, Commander.',
  },
];

export class LoreIntroScreen implements ScreenComponent {
  private element: HTMLElement | null = null;
  private eventBus: EventBus;
  private state: GameState | null = null;
  private animFrame = 0;
  private done = false;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: { x: number; y: number; vy: number; size: number; alpha: number }[] = [];
  private currentSlide = 0;
  private slides: IntroSlide[] = [];
  private raceColor = '#4488ff';
  private slideTransitioning = false;
  private explicitRaceId: string | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  setRaceId(raceId: string): void {
    this.explicitRaceId = raceId;
  }

  show(container: HTMLElement): void {
    this.done = false;
    this.currentSlide = 0;
    this.slideTransitioning = false;


    const raceId = this.explicitRaceId || this.state?.config?.playerRaceId || 'humans';
    const raceData = getRaceData(raceId);

    this.slides = RACE_SLIDES[raceId] || DEFAULT_SLIDES;
    this.raceColor = raceData?.visuals.primaryColor || '#4488ff';

    const emblem = raceData?.visuals.emblemIcon || '⊕';
    const raceName = raceData?.race.name || 'Unknown';

    this.element = document.createElement('div');
    this.element.className = 'lore-intro-screen';
    this.element.innerHTML = `
      <canvas class="lore-intro-canvas" id="lore-canvas"></canvas>
      <div class="lore-slide-content" id="lore-slide-content">
        <div class="lore-slide-race-header">
          <div class="lore-slide-emblem" id="lore-emblem" style="color:${this.raceColor};text-shadow:0 0 30px ${this.raceColor}66;">${emblem}</div>
          <div class="lore-slide-race-name" style="color:${this.raceColor};">${raceName}</div>
        </div>
        <div class="lore-slide-divider" style="background:linear-gradient(to right, transparent, ${this.raceColor}88, transparent);"></div>
        <h2 class="lore-slide-title" id="lore-slide-title">${this.slides[0].title}</h2>
        <p class="lore-slide-text" id="lore-slide-text">${this.slides[0].text}</p>
      </div>
      <div class="lore-slide-footer">
        <div class="lore-slide-progress" id="lore-progress">
          ${this.slides.map((_, i) => `<div class="lore-slide-dot ${i === 0 ? 'active' : ''}" style="background:${i === 0 ? this.raceColor : 'rgba(255,255,255,0.2)'};"></div>`).join('')}
        </div>
        <button class="lore-slide-next-btn" id="lore-next-btn" style="border-color:${this.raceColor}88;color:${this.raceColor};">Next</button>
        <button class="lore-slide-skip-btn" id="lore-skip-btn">Skip Intro</button>
      </div>
    `;
    container.appendChild(this.element);

    // Setup starfield canvas
    this.canvas = this.element.querySelector('#lore-canvas') as HTMLCanvasElement;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext('2d');

    // Init star particles
    this.particles = [];
    for (let i = 0; i < 250; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vy: -Math.random() * 0.12 - 0.03,
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.6 + 0.1,
      });
    }

    // Event handlers
    this.element.addEventListener('click', this.handleAdvance);
    document.addEventListener('keydown', this.handleKeyAdvance);

    this.element.querySelector('#lore-next-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleAdvance();
    });

    this.element.querySelector('#lore-skip-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.finish();
    });

    this.animate();
  }

  hide(): void {
    this.done = true;
    cancelAnimationFrame(this.animFrame);
    document.removeEventListener('keydown', this.handleKeyAdvance);
    this.element?.removeEventListener('click', this.handleAdvance);
    this.element?.remove();
    this.element = null;
    this.canvas = null;
    this.ctx = null;
  }

  update(state: GameState): void {
    this.state = state;
  }

  private handleAdvance = (): void => {
    if (this.done || this.slideTransitioning) return;
    this.advanceSlide();
  };

  private handleKeyAdvance = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      this.handleAdvance();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      this.finish();
    }
  };

  private advanceSlide(): void {
    if (this.currentSlide >= this.slides.length - 1) {
      this.finish();
      return;
    }

    this.slideTransitioning = true;

    const contentEl = this.element?.querySelector('#lore-slide-content') as HTMLElement;
    if (!contentEl) return;

    // Fade out
    contentEl.style.transition = 'opacity 0.5s ease';
    contentEl.style.opacity = '0';

    setTimeout(() => {
      this.currentSlide++;
  

      // Update content
      const titleEl = this.element?.querySelector('#lore-slide-title');
      const textEl = this.element?.querySelector('#lore-slide-text');
      if (titleEl) titleEl.textContent = this.slides[this.currentSlide].title;
      if (textEl) textEl.textContent = this.slides[this.currentSlide].text;

      // Update next button text on last slide
      const nextBtn = this.element?.querySelector('#lore-next-btn');
      if (nextBtn) {
        nextBtn.textContent = this.currentSlide >= this.slides.length - 1 ? 'Begin' : 'Next';
      }

      // Update progress dots
      this.element?.querySelectorAll('.lore-slide-dot').forEach((dot, i) => {
        const dotEl = dot as HTMLElement;
        const isActive = i <= this.currentSlide;
        dotEl.classList.toggle('active', isActive);
        dotEl.style.background = isActive ? this.raceColor : 'rgba(255,255,255,0.2)';
      });

      // Fade in
      contentEl.style.opacity = '1';
      this.slideTransitioning = false;
    }, 500);
  }

  private animate = (): void => {
    if (this.done || !this.ctx || !this.canvas) return;
    this.animFrame = requestAnimationFrame(this.animate);

    const now = performance.now();

    // Draw starfield background
    this.ctx.fillStyle = 'rgba(2, 3, 10, 1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      p.y += p.vy;
      if (p.y < 0) {
        p.y = this.canvas.height;
        p.x = Math.random() * this.canvas.width;
      }

      const twinkle = 0.6 + 0.4 * Math.sin(now * 0.001 + p.x * 0.02);
      this.ctx.globalAlpha = p.alpha * twinkle;
      this.ctx.fillStyle = '#aabbdd';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Race-colored nebula glow
    this.ctx.globalAlpha = 0.05;
    const grad = this.ctx.createRadialGradient(
      this.canvas.width * 0.5, this.canvas.height * 0.35, 0,
      this.canvas.width * 0.5, this.canvas.height * 0.35, this.canvas.width * 0.5
    );
    grad.addColorStop(0, this.raceColor);
    grad.addColorStop(0.4, this.raceColor + '33');
    grad.addColorStop(1, 'transparent');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalAlpha = 1;

  };

  private finish(): void {
    this.done = true;
    cancelAnimationFrame(this.animFrame);
    document.removeEventListener('keydown', this.handleKeyAdvance);

    if (this.element) {
      this.element.style.transition = 'opacity 0.8s ease';
      this.element.style.opacity = '0';
      setTimeout(() => {
        this.eventBus.emit('loreIntro:complete', {});
      }, 800);
    }
  }
}
