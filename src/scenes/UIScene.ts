import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { GameState, potentialPayout } from '../systems/GameState';
import { DIFFICULTIES, DIFFICULTY_ORDER, DifficultyKey } from '../config/difficulty';
import { GameScene } from './GameScene';

const FONT = { fontFamily: 'monospace', color: '#ffffff' };

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private ready = false;

  // HUD elements
  private balanceText!: Phaser.GameObjects.Text;
  private multiplierText!: Phaser.GameObjects.Text;
  private payoutText!: Phaser.GameObjects.Text;
  private laneText!: Phaser.GameObjects.Text;
  private stakeText!: Phaser.GameObjects.Text;
  private resultBanner!: Phaser.GameObjects.Container;
  private resultText!: Phaser.GameObjects.Text;

  // Panels
  private idlePanel!: Phaser.GameObjects.Container;
  private activeBar!: Phaser.GameObjects.Container;
  private topBar!: Phaser.GameObjects.Container;

  // Buttons
  private anzaBtn!: Phaser.GameObjects.Container;
  private toaBtn!: Phaser.GameObjects.Container;
  private stakeMinusBtn!: Phaser.GameObjects.Container;
  private stakePlusBtn!: Phaser.GameObjects.Container;
  private topupBtn!: Phaser.GameObjects.Container;
  private diffBtns: Map<DifficultyKey, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { gameScene: GameScene }): void {
    this.gameScene = data.gameScene;
  }

  create(): void {
    this.buildTopBar();
    this.buildMultiplierDisplay();
    this.buildIdlePanel();
    this.buildActiveBar();
    this.buildResultBanner();

    this.ready = true;
    this.onStateUpdate(this.gameScene.state);
  }

  // ─── Top bar: balance, lanes (compact) ──────────────────────────────────────

  private buildTopBar(): void {
    this.topBar = this.add.container(0, 0);

    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.85);
    bg.fillRoundedRect(4, 4, GAME_WIDTH - 8, 36, 8);

    this.balanceText = this.add.text(14, 10, 'Pesa: 1,000', {
      ...FONT, fontSize: '13px',
    });

    this.laneText = this.add.text(GAME_WIDTH / 2, 10, 'Njia: 0', {
      ...FONT, fontSize: '13px',
    }).setOrigin(0.5, 0);

    this.topupBtn = this.makeButton(GAME_WIDTH - 48, 22, '+ Pesa', 0x065f46, () => {
      this.gameScene.topUp();
    }, 60, 22);

    this.topBar.add([bg, this.balanceText, this.laneText, this.topupBtn]);
  }

  // ─── Multiplier (floating, minimal) ─────────────────────────────────────────

  private buildMultiplierDisplay(): void {
    this.multiplierText = this.add.text(GAME_WIDTH / 2, 56, '1.00×', {
      ...FONT, fontSize: '28px', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setAlpha(0.9);

    this.payoutText = this.add.text(GAME_WIDTH / 2, 78, '', {
      ...FONT, fontSize: '11px', color: '#86efac',
    }).setOrigin(0.5, 0.5);
  }

  // ─── Idle panel: stake, difficulty, ANZA (shown only when IDLE) ─────────────

  private buildIdlePanel(): void {
    this.idlePanel = this.add.container(0, 0);
    const panelH = 130;
    const panelY = GAME_HEIGHT - panelH;

    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.95);
    bg.fillRoundedRect(10, panelY, GAME_WIDTH - 20, panelH - 6, { tl: 14, tr: 14, bl: 14, br: 14 });
    this.idlePanel.add(bg);

    // Stake row
    const stakeY = panelY + 12;
    const stakeLabel = this.add.text(20, stakeY + 2, 'Dau:', { ...FONT, fontSize: '13px' });

    this.stakeMinusBtn = this.makeButton(110, stakeY + 10, '−', 0x374151, () => {
      this.gameScene.setStake(this.gameScene.state.stake - 10);
    }, 36, 26);

    this.stakeText = this.add.text(GAME_WIDTH / 2, stakeY, '10', {
      ...FONT, fontSize: '17px', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.stakePlusBtn = this.makeButton(GAME_WIDTH - 110, stakeY + 10, '+', 0x374151, () => {
      this.gameScene.setStake(this.gameScene.state.stake + 10);
    }, 36, 26);

    this.idlePanel.add([stakeLabel, this.stakeMinusBtn, this.stakeText, this.stakePlusBtn]);

    // Difficulty row
    const diffY = panelY + 44;
    const diffBtnW = 80;
    const totalW = DIFFICULTY_ORDER.length * diffBtnW + (DIFFICULTY_ORDER.length - 1) * 6;
    const startX = (GAME_WIDTH - totalW) / 2;

    DIFFICULTY_ORDER.forEach((key, i) => {
      const cfg = DIFFICULTIES[key];
      const bx = startX + i * (diffBtnW + 6) + diffBtnW / 2;
      const btn = this.makeButton(bx, diffY + 12, cfg.label, cfg.color, () => {
        this.gameScene.setDifficulty(key);
      }, diffBtnW, 26);
      this.diffBtns.set(key, btn);
      this.idlePanel.add(btn);
    });

    // ANZA button — big and centered
    const btnY = panelY + 92;
    this.anzaBtn = this.makeButton(GAME_WIDTH / 2, btnY, 'ANZA', 0x16a34a, () => {
      this.gameScene.handleHopInput();
    }, 200, 38);
    this.idlePanel.add(this.anzaBtn);
  }

  // ─── Active bar: slim TOA bar at bottom during gameplay ─────────────────────

  private buildActiveBar(): void {
    this.activeBar = this.add.container(0, 0);
    this.activeBar.setVisible(false);

    const barH = 44;
    const barY = GAME_HEIGHT - barH - 4;

    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.8);
    bg.fillRoundedRect(GAME_WIDTH / 2 - 90, barY, 180, barH, 10);
    this.activeBar.add(bg);

    this.toaBtn = this.makeButton(GAME_WIDTH / 2, barY + barH / 2, 'TOA  💰', 0xb45309, () => {
      this.gameScene.handleToa();
    }, 160, 34);
    this.activeBar.add(this.toaBtn);
  }

  // ─── Result banner ──────────────────────────────────────────────────────────

  private resultSubText!: Phaser.GameObjects.Text;
  private continueText!: Phaser.GameObjects.Text;

  private buildResultBanner(): void {
    this.resultBanner = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
    this.resultBanner.setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.97);
    bg.fillRoundedRect(-180, -60, 360, 150, 18);
    bg.lineStyle(2, 0xffffff, 0.08);
    bg.strokeRoundedRect(-180, -60, 360, 150, 18);

    this.resultText = this.add.text(0, -26, '', {
      ...FONT, fontSize: '28px', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.resultSubText = this.add.text(0, 10, '', {
      ...FONT, fontSize: '13px',
    }).setOrigin(0.5, 0.5);

    const continueBtn = this.add.graphics();
    continueBtn.fillStyle(0x3b82f6, 1);
    continueBtn.fillRoundedRect(-60, 38, 120, 34, 8);

    this.continueText = this.add.text(0, 55, 'ENDELEA', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    this.resultBanner.add([bg, this.resultText, this.resultSubText, continueBtn, this.continueText]);
    this.resultBanner.setSize(360, 150);
    this.resultBanner.setInteractive();
    this.resultBanner.on('pointerdown', () => {
      this.gameScene.returnToIdle();
    });
  }

  // ─── State update ─────────────────────────────────────────────────────────────

  onStateUpdate(state: GameState): void {
    if (!this.ready) return;

    const diff = DIFFICULTIES[state.difficulty];
    const payout = potentialPayout(state);
    const isIdle = state.phase === 'IDLE';
    const isPlaying = state.phase === 'ACTIVE' || state.phase === 'HOPPING';

    this.balanceText.setText(`Pesa: ${state.balance.toLocaleString()}`);
    this.laneText.setText(`Njia: ${state.lanesCleared}`);

    // Multiplier
    this.multiplierText.setText(`${state.multiplier.toFixed(2)}×`);
    this.multiplierText.setColor(
      state.multiplier >= 10 ? '#f87171' :
      state.multiplier >= 5  ? '#fb923c' :
      state.multiplier >= 2  ? '#fbbf24' : '#ffffff'
    );
    this.multiplierText.setVisible(isPlaying || state.phase === 'HOPPING');

    // Payout info
    if (isPlaying) {
      this.payoutText.setText(`Toa → ${payout.toLocaleString()} pesa`).setVisible(true);
    } else {
      this.payoutText.setVisible(false);
    }

    // Swap panels: idle panel vs active bar
    this.idlePanel.setVisible(isIdle);
    this.activeBar.setVisible(isPlaying);

    // TOA button opacity
    this.setAlpha(this.toaBtn, (isPlaying && state.multiplier > 1) ? 1 : 0.25);

    // Stake
    this.stakeText.setText(state.stake.toLocaleString());
    this.setAlpha(this.stakeMinusBtn, isIdle ? 1 : 0.3);
    this.setAlpha(this.stakePlusBtn, isIdle ? 1 : 0.3);

    // Difficulty highlights
    DIFFICULTY_ORDER.forEach(key => {
      const btn = this.diffBtns.get(key);
      if (!btn) return;
      const isActive = key === state.difficulty;
      const cfg = DIFFICULTIES[key];
      const bg = btn.list[0] as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(isActive ? cfg.color : 0x374151);
      bg.fillRoundedRect(-40, -13, 80, 26, 7);
    });

    // Top-up
    this.setAlpha(this.topupBtn, state.balance < state.stake ? 1 : 0.35);

    // Result banner
    if (state.phase === 'ENDED') {
      this.idlePanel.setVisible(false);
      this.activeBar.setVisible(false);

      if (state.lastResult === 'loss') {
        this.resultText.setText('💥 PANCHA!').setColor('#f87171');
        this.resultSubText
          .setText(`-${state.stake.toLocaleString()} pesa • Njia ${state.lanesCleared}`)
          .setColor('#9ca3af');
      } else {
        this.resultText.setText(`✅ +${state.lastPayout.toLocaleString()} pesa`).setColor('#86efac');
        this.resultSubText
          .setText(`Njia ${state.lanesCleared} • ${state.multiplier.toFixed(2)}×`)
          .setColor('#6ee7b7');
      }
      this.resultBanner.setVisible(true);
      this.resultBanner.setScale(0.3);
      this.resultBanner.setAlpha(0);
      this.tweens.add({
        targets: this.resultBanner,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 350,
        ease: 'Back.easeOut',
      });
    } else {
      this.resultBanner.setVisible(false);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private makeButton(
    x: number, y: number,
    label: string, color: number,
    callback: () => void,
    w = 80, h = 30
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 7);

    const tx = this.add.text(0, 0, label, {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    container.add([bg, tx]);
    container.setSize(w, h);
    container.setInteractive();
    container.on('pointerdown', callback);

    return container;
  }

  private setAlpha(container: Phaser.GameObjects.Container, alpha: number): void {
    container.setAlpha(alpha);
  }
}
