/**
 * Admin agent tools for Bingo and Kikiri games.
 * Permet d'ouvrir/fermer les jeux et modifier les configs.
 */
import { BingoConfigService } from '../../bingo/bingo-config.service';
import { KikiriConfigService } from '../../kikiri/kikiri-config.service';
import { BingoSchedulerService } from '../../bingo/bingo-scheduler.service';
import { KikiriSchedulerService } from '../../kikiri/kikiri-scheduler.service';
import { BingoMode, BingoDrawSpeed } from '../../entities/bingo-config.entity';
import { KikiriMode } from '../../entities/kikiri-config.entity';

export const getGameConfigTool = {
  type: 'function' as const,
  function: {
    name: 'get_game_config',
    description:
      "Récupère la configuration d'un jeu (Bingo ou Kikiri). Retourne mode, manualEnabled, horaires, etc.",
    parameters: {
      type: 'object',
      properties: {
        game: {
          type: 'string',
          enum: ['bingo', 'kikiri'],
          description: "Nom du jeu : 'bingo' ou 'kikiri'",
        },
      },
      required: ['game'],
    },
  },
};

export const updateGameConfigTool = {
  type: 'function' as const,
  function: {
    name: 'update_game_config',
    description:
      "Met à jour la configuration d'un jeu. Pour ouvrir/fermer en mode manuel : mode='manual' et manualEnabled=true/false.",
    parameters: {
      type: 'object',
      properties: {
        game: {
          type: 'string',
          enum: ['bingo', 'kikiri'],
          description: "Nom du jeu : 'bingo' ou 'kikiri'",
        },
        mode: {
          type: 'string',
          enum: ['manual', 'cruise'],
          description: "Mode : 'manual' (contrôle manuel) ou 'cruise' (horaires automatiques)",
        },
        manualEnabled: {
          type: 'boolean',
          description: 'En mode manuel : true = jeu ouvert, false = jeu fermé',
        },
        openHour: { type: 'number', description: "Heure d'ouverture (0-23) en mode croisière" },
        openMinute: { type: 'number', description: "Minute d'ouverture (0-59)" },
        closeHour: { type: 'number', description: "Heure de fermeture (0-23) en mode croisière" },
        closeMinute: { type: 'number', description: "Minute de fermeture (0-59)" },
        drawSpeed: {
          type: 'string',
          enum: ['fast', 'medium', 'slow'],
          description: 'Bingo uniquement : vitesse du tirage (fast=3s, medium=5s, slow=8s)',
        },
        gridPrice: { type: 'number', description: 'Bingo uniquement : prix d\'une grille en jetons Jiji' },
        bettingDurationSeconds: {
          type: 'number',
          description: 'Kikiri uniquement : durée des paris en secondes (défaut 300)',
        },
        postResolutionDelaySeconds: {
          type: 'number',
          description: 'Kikiri uniquement : délai entre tirage et suivant en secondes (défaut 18)',
        },
      },
      required: ['game'],
    },
  },
};

export const openGameTool = {
  type: 'function' as const,
  function: {
    name: 'open_game',
    description:
      "Ouvre un jeu (Bingo ou Kikiri). Passe en mode manuel et active le jeu. Lance immédiatement une partie si aucune n'est en cours.",
    parameters: {
      type: 'object',
      properties: {
        game: {
          type: 'string',
          enum: ['bingo', 'kikiri'],
          description: "Nom du jeu : 'bingo' ou 'kikiri'",
        },
      },
      required: ['game'],
    },
  },
};

export const closeGameTool = {
  type: 'function' as const,
  function: {
    name: 'close_game',
    description:
      "Ferme un jeu (Bingo ou Kikiri). Passe en mode manuel et désactive le jeu. La partie en cours se termine, puis le jeu se ferme.",
    parameters: {
      type: 'object',
      properties: {
        game: {
          type: 'string',
          enum: ['bingo', 'kikiri'],
          description: "Nom du jeu : 'bingo' ou 'kikiri'",
        },
      },
      required: ['game'],
    },
  },
};

export async function executeGetGameConfig(
  bingoConfigService: BingoConfigService,
  kikiriConfigService: KikiriConfigService,
  args: { game: 'bingo' | 'kikiri' },
): Promise<string> {
  const service = args.game === 'bingo' ? bingoConfigService : kikiriConfigService;
  const config = await service.getConfig();
  const isOpen = await service.isGameOpen();
  return JSON.stringify(
    {
      game: args.game,
      isOpen,
      ...config,
    },
    null,
    2,
  );
}

export async function executeUpdateGameConfig(
  bingoConfigService: BingoConfigService,
  kikiriConfigService: KikiriConfigService,
  bingoSchedulerService: BingoSchedulerService,
  kikiriSchedulerService: KikiriSchedulerService,
  args: {
    game: 'bingo' | 'kikiri';
    mode?: 'manual' | 'cruise';
    manualEnabled?: boolean;
    openHour?: number;
    openMinute?: number;
    closeHour?: number;
    closeMinute?: number;
    drawSpeed?: 'fast' | 'medium' | 'slow';
    gridPrice?: number;
    bettingDurationSeconds?: number;
    postResolutionDelaySeconds?: number;
  },
): Promise<string> {
  const isBingo = args.game === 'bingo';
  const configService = isBingo ? bingoConfigService : kikiriConfigService;
  const schedulerService = isBingo ? bingoSchedulerService : kikiriSchedulerService;

  const prevConfig = await configService.getConfig();

  if (isBingo) {
    const bingoUpdates: Partial<{ mode: BingoMode; manualEnabled: boolean; openHour: number; openMinute: number; closeHour: number; closeMinute: number; drawSpeed: BingoDrawSpeed; gridPrice: number }> = {};
    if (args.mode !== undefined) bingoUpdates.mode = args.mode as BingoMode;
    if (args.manualEnabled !== undefined) bingoUpdates.manualEnabled = args.manualEnabled;
    if (args.openHour !== undefined) bingoUpdates.openHour = args.openHour;
    if (args.openMinute !== undefined) bingoUpdates.openMinute = args.openMinute;
    if (args.closeHour !== undefined) bingoUpdates.closeHour = args.closeHour;
    if (args.closeMinute !== undefined) bingoUpdates.closeMinute = args.closeMinute;
    if (args.drawSpeed !== undefined) bingoUpdates.drawSpeed = args.drawSpeed as BingoDrawSpeed;
    if (args.gridPrice !== undefined) bingoUpdates.gridPrice = args.gridPrice;
    await bingoConfigService.updateConfig(bingoUpdates);
  } else {
    const kikiriUpdates: Partial<{ mode: KikiriMode; manualEnabled: boolean; openHour: number; openMinute: number; closeHour: number; closeMinute: number; bettingDurationSeconds: number; postResolutionDelaySeconds: number }> = {};
    if (args.mode !== undefined) kikiriUpdates.mode = args.mode as KikiriMode;
    if (args.manualEnabled !== undefined) kikiriUpdates.manualEnabled = args.manualEnabled;
    if (args.openHour !== undefined) kikiriUpdates.openHour = args.openHour;
    if (args.openMinute !== undefined) kikiriUpdates.openMinute = args.openMinute;
    if (args.closeHour !== undefined) kikiriUpdates.closeHour = args.closeHour;
    if (args.closeMinute !== undefined) kikiriUpdates.closeMinute = args.closeMinute;
    if (args.bettingDurationSeconds !== undefined)
      kikiriUpdates.bettingDurationSeconds = args.bettingDurationSeconds;
    if (args.postResolutionDelaySeconds !== undefined)
      kikiriUpdates.postResolutionDelaySeconds = args.postResolutionDelaySeconds;
    await kikiriConfigService.updateConfig(kikiriUpdates);
  }

  const updated = await configService.getConfig();

  // En mode manuel : si on ouvre (manualEnabled -> true), lancer un cycle immédiatement
  if (
    prevConfig.mode === 'manual' &&
    prevConfig.manualEnabled === false &&
    updated.manualEnabled === true
  ) {
    await schedulerService.triggerCycle();
  }

  const isOpen = await configService.isGameOpen();
  return JSON.stringify(
    {
      success: true,
      message: `Config ${args.game} mise à jour`,
      isOpen,
      ...updated,
    },
    null,
    2,
  );
}

export async function executeOpenGame(
  bingoConfigService: BingoConfigService,
  kikiriConfigService: KikiriConfigService,
  bingoSchedulerService: BingoSchedulerService,
  kikiriSchedulerService: KikiriSchedulerService,
  args: { game: 'bingo' | 'kikiri' },
): Promise<string> {
  const isBingo = args.game === 'bingo';
  const configService = isBingo ? bingoConfigService : kikiriConfigService;
  const schedulerService = isBingo ? bingoSchedulerService : kikiriSchedulerService;

  const prevConfig = await configService.getConfig();
  if (isBingo) {
    await bingoConfigService.updateConfig({ mode: BingoMode.MANUAL, manualEnabled: true });
  } else {
    await kikiriConfigService.updateConfig({ mode: KikiriMode.MANUAL, manualEnabled: true });
  }

  if (prevConfig.mode === 'manual' && prevConfig.manualEnabled === false) {
    await schedulerService.triggerCycle();
  }

  return JSON.stringify({
    success: true,
    message: `${args.game === 'bingo' ? 'Bingo' : 'Kikiri'} ouvert en mode manuel`,
    isOpen: true,
  });
}

export async function executeCloseGame(
  bingoConfigService: BingoConfigService,
  kikiriConfigService: KikiriConfigService,
  args: { game: 'bingo' | 'kikiri' },
): Promise<string> {
  if (args.game === 'bingo') {
    await bingoConfigService.updateConfig({ mode: BingoMode.MANUAL, manualEnabled: false });
  } else {
    await kikiriConfigService.updateConfig({ mode: KikiriMode.MANUAL, manualEnabled: false });
  }

  return JSON.stringify({
    success: true,
    message: `${args.game === 'bingo' ? 'Bingo' : 'Kikiri'} fermé. La partie en cours se terminera puis le jeu se fermera.`,
    isOpen: false,
  });
}
