import { Difficulty } from '@/api';

/**
 * Lokalizované popisky obtížnosti pro UI (selecty, badge na kartě).
 * Žije mimo `src/api/models/Difficulty.ts` schválně — ten soubor je
 * generovaný OpenAPI generatorem, takže by se runtime helpery při
 * regeneraci klienta zahodily.
 */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  complete_beginner: 'Úplný začátečník',
  beginner: 'Začátečník',
  slightly_advanced: 'Mírně pokročilý',
  intermediate: 'Středně pokročilý',
  advanced: 'Pokročilý',
  expert: 'Expert',
};

/** Pořadí pro select — od nejjednoduššího po nejtěžší. */
export const DIFFICULTY_ORDER: Difficulty[] = [
  Difficulty.CompleteBeginner,
  Difficulty.Beginner,
  Difficulty.SlightlyAdvanced,
  Difficulty.Intermediate,
  Difficulty.Advanced,
  Difficulty.Expert,
];
