import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { GameState, potentialPayout } from '../systems/GameState';
import { DIFFICULTIES, DIFFICULTY_ORDER, DifficultyKey } from '../config/difficulty';
import { GameScene } from './GameScene';

const FONT = { fontFamily: 'monospace', color: '#ffffff' };
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const S = IS_TOUCH ? 1.2 : 1;

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private ready = false;

  private balanceText!: Phaser.GameObjects.Text;
  private multiplierText!: Phaser.GameObjects.Text;
  private payoutText!: Phaser.GameObjects.Text;
  private laneText!: Phaser.GameObjects.Text;
  private stakeText!: Phaser.GameObjects.Text;
  private resultBanner!: Phaser.GameObjects.Container;
  private resultText!: Phaser.GameObjects.Text;

  private idlePanel!: Phaser.GameObjects.Container;
  private activeBar!: Phaser.GameObjects.Container;
  private topBar!: Phaser.GameObjects.Container;

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
    this.setupSwipe();

    this.ready = true;
    this.onStateUpdate(this.gameScene.state);
  }

  // ─── Swipe-right to hop (mobile) ──────────────────────────────────────────

  private setupSwipe(): void {
    let startX = 0;
    let startY = 0;
    let swiping = false;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      startX = p.x;
      startY = p.y;
      swiping = true;
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!swiping) return;
      swiping = false;
      const dx = p.x - startX;
      const dy = Math.abs(p.y - startY);
      if (dx > 40 && dy < dx * 0.7) {
        this.gameScene.handleHopInput();
      }
    });
  }

  // ─── Top bar ──────────────────────────────────────────────────────────────

  private buildTopBar(): void {
    this.topBar = this.add.container(0, 0);
    const barH = Math.round(40 * S);

    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.85);
    bg.fillRoundedRect(4, 4, GAME_WIDTH - 8, barH, 8);

    this.balanceText = this.add.text(14, 10, 'Pesa: 1,000', {
      ...FONT, fontSize: `${Math.round(14 * S)}px`,
    });

    this.laneText = this.add.text(GAME_WIDTH / 2, 10, 'Njia: 0', {
      ...FONT, fontSize: `${Math.round(14 * S)}px`,
    }).setOrigin(0.5, 0);

    this.topupBtn = this.makeButton(GAME_WIDTH - 52, barH / 2 + 4, '+ Pesa', 0x065f46, () => {
      this.gameScene.topUp();
    }, Math.round(68 * S), Math.round(26 * S));

    this.topBar.add([bg, this.balanceText, this.laneText, this.topupBtn]);
  }

  // ─── Multiplier ───────────────────────────────────────────────────────────

  private buildMultiplierDisplay(): void {
    this.multiplierText = this.add.text(GAME_WIDTH / 2, Math.round(56 * S), '1.00×', {
      ...FONT, fontSize: `${Math.round(28 * S)}px`, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setAlpha(0.9);

    this.payoutText = this.add.text(GAME_WIDTH / 2, Math.round(80 * S), '', {
      ...FONT, fontSize: `${Math.round(12 * S)}px`, color: '#86efac',
    }).setOrigin(0.5, 0.5);
  }

  // ─── Idle panel ───────────────────────────────────────────────────────────

  private buildIdlePanel(): void {
    this.idlePanel = this.add.container(0, 0);
    const panelH = Math.round(140 * S);
    const panelY = GAME_HEIGHT - panelH;

    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.95);
    bg.fillRoundedRect(10, panelY, GAME_WIDTH - 20, panelH - 6, { tl: 14, tr: 14, bl: 14, br: 14 });
    this.idlePanel.add(bg);

    // Stake row
    const stakeY = panelY + Math.round(14 * S);
    const stakeLabel = this.add.text(20, stakeY + 2, 'Dau:', {
      ...FONT, fontSize: `${Math.round(14 * S)}px`,
    });

    const btnH = Math.round(32 * S);
    const btnW = Math.round(44 * S);

    this.stakeMinusBtn = this.makeButton(110, stakeY + btnH / 2, '−', 0x374151, () => {
      this.gameScene.setStake(this.gameScene.state.stake - 10);
    }, btnW, btnH);

    this.stakeText = this.add.text(GAME_WIDTH / 2, stakeY, '10', {
      ...FONT, fontSize: `${Math.round(18 * S)}px`, fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.stakePlusBtn = this.makeButton(GAME_WIDTH - 110, stakeY + btnH / 2, '+', 0x374151, () => {
      this.gameScene.setStake(this.gameScene.state.stake + 10);
    }, btnW, btnH);

    this.idlePanel.add([stakeLabel, this.stakeMinusBtn, this.stakeText, this.stakePlusBtn]);

    // Difficulty row
    const diffY = panelY + Math.round(50 * S);
    const diffBtnW = Math.round(82 * S);
    const diffBtnH = Math.round(30 * S);
    const totalW = DIFFICULTY_ORDER.length * diffBtnW + (DIFFICULTY_ORDER.length - 1) * 6;
    const startX = (GAME_WIDTH - totalW) / 2;

    DIFFICULTY_ORDER.forEach((key, i) => {
      const cfg = DIFFICULTIES[key];
      const bx = startX + i * (diffBtnW + 6) + diffBtnW / 2;
      const btn = this.makeButton(bx, diffY + diffBtnH / 2, cfg.label, cfg.color, () => {
        this.gameScene.setDifficulty(key);
      }, diffBtnW, diffBtnH);
      this.diffBtns.set(key, btn);
      this.idlePanel.add(btn);
    });

    // ANZA button
    const anzaY = panelY + Math.round(96 * S);
    const anzaW = Math.round(220 * S);
    const anzaH = Math.round(42 * S);
    this.anzaBtn = this.makeButton(GAME_WIDTH / 2, anzaY, 'ANZA', 0x16a34a, () => {
      this.gameScene.handleHopInput();
    }, anzaW, anzaH);
    this.idlePanel.add(this.anzaBtn);
  }

  // ─── Active bar ───────────────────────────────────────────────────────────

  private buildActiveBar(): void {
    this.activeBar = this.add.container(0, 0);
    this.activeBar.setVisible(false);

    const barH = Math.round(50 * S);
    const barW = Math.round(200 * S);
    const barY = GAME_HEIGHT - barH - 6;

    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.8);
    bg.fillRoundedRect(GAME_WIDTH / 2 - barW / 2, barY, barW, barH, 12);
    this.activeBar.add(bg);

    this.toaBtn = this.makeButton(GAME_WIDTH / 2, barY + barH / 2, 'TOA  💰', 0xb45309, () => {
      this.gameScene.handleToa();
    }, Math.round(180 * S), Math.round(40 * S));
    this.activeBar.add(this.toaBtn);
  }

  // ─── Result banner ────────────────────────────────────────────────────────

  private resultSubText!: Phaser.GameObjects.Text;
  private continueText!: Phaser.GameObjects.Text;

  private buildResultBanner(): void {
    this.resultBanner = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
    this.resultBanner.setVisible(false);

    const bw = Math.round(380 * S);
    const bh = Math.round(160 * S);

    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.97);
    bg.fillRoundedRect(-bw / 2, -bh / 2 + 10, bw, bh, 18);
    bg.lineStyle(2, 0xffffff, 0.08);
    bg.strokeRoundedRect(-bw / 2, -bh / 2 + 10, bw, bh, 18);

    this.resultText = this.add.text(0, -20, '', {
      ...FONT, fontSize: `${Math.round(28 * S)}px`, fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.resultSubText = this.add.text(0, Math.round(14 * S), '', {
      ...FONT, fontSize: `${Math.round(14 * S)}px`,
    }).setOrigin(0.5, 0.5);

    const cbw = Math.round(140 * S);
    const cbh = Math.round(38 * S);
    const continueBtn = this.add.graphics();
    continueBtn.fillStyle(0x3b82f6, 1);
    continueBtn.fillRoundedRect(-cbw / 2, Math.round(40 * S), cbw, cbh, 8);

    this.continueText = this.add.text(0, Math.round(40 * S) + cbh / 2, 'ENDELEA', {
      fontFamily: 'monospace', fontSize: `${Math.round(14 * S)}px`, fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    this.resultBanner.add([bg, this.resultText, this.resultSubText, continueBtn, this.continueText]);
    this.resultBanner.setSize(bw, bh);
    this.resultBanner.setInteractive();
    this.resultBanner.on('pointerdown', () => {
      this.gameScene.returnToIdle();
    });
  }

  // ─── State update ─────────────────────────────────────────────────────────

  onStateUpdate(state: GameState): void {
    if (!this.ready) return;

    const diff = DIFFICULTIES[state.difficulty];
    const payout = potentialPayout(state);
    const isIdle = state.phase === 'IDLE';
    const isPlaying = state.phase === 'ACTIVE' || state.phase === 'HOPPING';

    this.balanceText.setText(`Pesa: ${state.balance.toLocaleString()}`);
    this.laneText.setText(`Njia: ${state.lanesCleared}`);

    this.multiplierText.setText(`${state.multiplier.toFixed(2)}×`);
    this.multiplierText.setColor(
      state.multiplier >= 10 ? '#f87171' :
      state.multiplier >= 5  ? '#fb923c' :
      state.multiplier >= 2  ? '#fbbf24' : '#ffffff'
    );
    this.multiplierText.setVisible(isPlaying);

    if (isPlaying) {
      this.payoutText.setText(`Toa → ${payout.toLocaleString()} pesa`).setVisible(true);
    } else {
      this.payoutText.setVisible(false);
    }

    this.idlePanel.setVisible(isIdle);
    this.activeBar.setVisible(isPlaying);

    this.setAlpha(this.toaBtn, (isPlaying && state.multiplier > 1) ? 1 : 0.25);

    this.stakeText.setText(state.stake.toLocaleString());
    this.setAlpha(this.stakeMinusBtn, isIdle ? 1 : 0.3);
    this.setAlpha(this.stakePlusBtn, isIdle ? 1 : 0.3);

    const diffHw = Math.round(41 * S);
    const diffHh = Math.round(15 * S);
    DIFFICULTY_ORDER.forEach(key => {
      const btn = this.diffBtns.get(key);
      if (!btn) return;
      const isActive = key === state.difficulty;
      const cfg = DIFFICULTIES[key];
      const bg = btn.list[0] as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(isActive ? cfg.color : 0x374151);
      bg.fillRoundedRect(-diffHw, -diffHh, diffHw * 2, diffHh * 2, 7);
    });

    this.setAlpha(this.topupBtn, state.balance < state.stake ? 1 : 0.35);

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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private makeButton(
    x: number, y: number,
    label: string, color: number,
    callback: () => void,
    w = 80, h = 30
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);

    const fontSize = Math.max(13, Math.round(13 * S));
    const tx = this.add.text(0, 0, label, {
      fontFamily: 'monospace', fontSize: `${fontSize}px`, fontStyle: 'bold', color: '#ffffff',
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
