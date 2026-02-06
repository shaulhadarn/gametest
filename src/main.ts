import { Game } from '@/Game';

async function main(): Promise<void> {
  const game = new Game();
  await game.init();

  // Expose for debugging
  (window as any).__game = game;
}

main().catch(console.error);
