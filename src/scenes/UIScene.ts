import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { GameState, potentialPayout } from '../systems/GameState';
import { DIFFICULTIES, DIFFICULTY_ORDER, DifficultyKey } from '../config/difficulty';
import { GameScene } from './GameScene';

const FONT = { fontFamily: 'monospace', color: '#ffffff' };

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

  private anzaBtn!: Phaser.GameObjects.Container;
  private toaBtn!: Phaser.GameObjects.Container;
  private stakeMinusBtn!: Phaser.GameObjects.Container;
  private stakePlusBtn!: Phaser.GameObjects.Container;
  private topupBtn!: Phaser.GameObjects.Container;
  private diffBtns: Map<DifficultyKey, Phaser.GameObjects.Container> = new Map();

  // Full-screen tap zone for hopping during active gameplay
  private hopZone!: Phaser.GameObjects.Zone;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { gameScene: GameScene }): void {
    this.gameScene = data.gameScene;
  }

  create(): void {
    this.buildHopZone();
    this.buildTopBar();
    this.buildMultiplierDisplay();
    this.buildIdlePanel();
    this.buildActiveBar();
    this.buildResultBanner();

    this.ready = true;
    this.onStateUpdate(this.gameScene.state);
  }

  // ─── Hop zone: full-screen tap/swipe area for gameplay ────────────────────

  private buildHopZone(): void {
    this.hopZone = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    this.hopZone.setInteractive();
    this.hopZone.setDepth(-1);

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    this.hopZone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      startX = p.x;
      startY = p.y;
      startTime = p.time;
    });

    this.hopZone.on('pointerup', (p: Phaser.Input.Pointer) => {
      const dx = p.x - startX;
      const dy = Math.abs(p.y - startY);
      const dt = p.time - startTime;

      // Swipe right → hop
      if (dx > 30 && dy < dx * 0.8) {
        this.gameScene.handleHopInput();
        return;
      }

      // Quick tap (< 300ms, didn't drag much) → hop
      if (dt < 300 && Math.abs(dx) < 20 && dy < 20) {
        this.gameScene.handleHopInput();
      }
    });
  }

  // ─── Top bar ──────────────────────────────────────────────────────────────

  private buildTopBar(): void {
    const barH = 40;
    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.88);
    bg.fillRoundedRect(4, 4, GAME_WIDTH - 8, barH, 8);

    this.balanceText = this.add.text(14, 12, 'Pesa: 1,000', {
      ...FONT, fontSize: '14px',
    });

    this.laneText = this.add.text(GAME_WIDTH / 2, 12, 'Njia: 0', {
      ...FONT, fontSize: '14px',
    }).setOrigin(0.5, 0);

    this.topupBtn = this.makeButton(GAME_WIDTH - 50, 24, '+ Pesa', 0x065f46, () => {
      this.gameScene.topUp();
    }, 68, 28);
  }

  // ─── Multiplier ───────────────────────────────────────────────────────────

  private buildMultiplierDisplay(): void {
    this.multiplierText = this.add.text(GAME_WIDTH / 2, 62, '1.00×', {
      ...FONT, fontSize: '30px', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setAlpha(0.9);

    this.payoutText = this.add.text(GAME_WIDTH / 2, 86, '', {
      ...FONT, fontSize: '12px', color: '#86efac',
    }).setOrigin(0.5, 0.5);
  }

  // ─── Idle panel ───────────────────────────────────────────────────────────

  private buildIdlePanel(): void {
    this.idlePanel = this.add.container(0, 0);
    const panelH = 150;
    const panelY = GAME_HEIGHT - panelH;

    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.95);
    bg.fillRoundedRect(8, panelY, GAME_WIDTH - 16, panelH - 4, { tl: 14, tr: 14, bl: 14, br: 14 });
    this.idlePanel.add(bg);

    // Stake row
    const stakeY = panelY + 14;
    const stakeLabel = this.add.text(20, stakeY + 4, 'Dau:', { ...FONT, fontSize: '14px' });

    this.stakeMinusBtn = this.makeButton(120, stakeY + 14, '−', 0x374151, () => {
      this.gameScene.setStake(this.gameScene.state.stake - 10);
    }, 50, 32);

    this.stakeText = this.add.text(GAME_WIDTH / 2, stakeY, '10', {
      ...FONT, fontSize: '20px', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.stakePlusBtn = this.makeButton(GAME_WIDTH - 120, stakeY + 14, '+', 0x374151, () => {
      this.gameScene.setStake(this.gameScene.state.stake + 10);
    }, 50, 32);

    this.idlePanel.add([stakeLabel, this.stakeMinusBtn, this.stakeText, this.stakePlusBtn]);

    // Difficulty row
    const diffY = panelY + 54;
    const diffBtnW = 90;
    const diffBtnH = 32;
    const totalW = DIFFICULTY_ORDER.length * diffBtnW + (DIFFICULTY_ORDER.length - 1) * 8;
    const startX = (GAME_WIDTH - totalW) / 2;

    DIFFICULTY_ORDER.forEach((key, i) => {
      const cfg = DIFFICULTIES[key];
      const bx = startX + i * (diffBtnW + 8) + diffBtnW / 2;
      const btn = this.makeButton(bx, diffY + diffBtnH / 2, cfg.label, cfg.color, () => {
        this.gameScene.setDifficulty(key);
      }, diffBtnW, diffBtnH);
      this.diffBtns.set(key, btn);
      this.idlePanel.add(btn);
    });

    // ANZA button — large tap target
    const btnY = panelY + 108;
    this.anzaBtn = this.makeButton(GAME_WIDTH / 2, btnY, 'ANZA', 0x16a34a, () => {
      this.gameScene.handleHopInput();
    }, 240, 44);
    this.idlePanel.add(this.anzaBtn);
  }

  // ─── Active bar ───────────────────────────────────────────────────────────

  private buildActiveBar(): void {
    this.activeBar = this.add.container(0, 0);
    this.activeBar.setVisible(false);

    const barH = 52;
    const barW = 220;
    const barY = GAME_HEIGHT - barH - 8;

    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.85);
    bg.fillRoundedRect(GAME_WIDTH / 2 - barW / 2, barY, barW, barH, 12);
    this.activeBar.add(bg);

    this.toaBtn = this.makeButton(GAME_WIDTH / 2, barY + barH / 2, 'TOA  💰', 0xb45309, () => {
      this.gameScene.handleToa();
    }, 200, 42);
    this.activeBar.add(this.toaBtn);
  }

  // ─── Result banner ────────────────────────────────────────────────────────

  private resultSubText!: Phaser.GameObjects.Text;
  private continueText!: Phaser.GameObjects.Text;

  private buildResultBanner(): void {
    this.resultBanner = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
    this.resultBanner.setVisible(false);

    const bw = 400;
    const bh = 170;
    const bg = this.add.graphics();
    bg.fillStyle(0x0f1225, 0.97);
    bg.fillRoundedRect(-bw / 2, -bh / 2 + 10, bw, bh, 18);
    bg.lineStyle(2, 0xffffff, 0.08);
    bg.strokeRoundedRect(-bw / 2, -bh / 2 + 10, bw, bh, 18);

    this.resultText = this.add.text(0, -20, '', {
      ...FONT, fontSize: '30px', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    this.resultSubText = this.add.text(0, 16, '', {
      ...FONT, fontSize: '14px',
    }).setOrigin(0.5, 0.5);

    const cbw = 160;
    const cbh = 42;
    const continueBtn = this.add.graphics();
    continueBtn.fillStyle(0x3b82f6, 1);
    continueBtn.fillRoundedRect(-cbw / 2, 44, cbw, cbh, 10);

    this.continueText = this.add.text(0, 44 + cbh / 2, 'ENDELEA', {
      fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#ffffff',
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

    // Panels
    this.idlePanel.setVisible(isIdle);
    this.activeBar.setVisible(isPlaying);

    // Hop zone only active during gameplay
    if (isPlaying) {
      this.hopZone.setInteractive();
    } else {
      this.hopZone.disableInteractive();
    }

    this.setAlpha(this.toaBtn, (isPlaying && state.multiplier > 1) ? 1 : 0.25);

    this.stakeText.setText(state.stake.toLocaleString());
    this.setAlpha(this.stakeMinusBtn, isIdle ? 1 : 0.3);
    this.setAlpha(this.stakePlusBtn, isIdle ? 1 : 0.3);

    const hw = 45;
    const hh = 16;
    DIFFICULTY_ORDER.forEach(key => {
      const btn = this.diffBtns.get(key);
      if (!btn) return;
      const isActive = key === state.difficulty;
      const cfg = DIFFICULTIES[key];
      const bg = btn.list[0] as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(isActive ? cfg.color : 0x374151);
      bg.fillRoundedRect(-hw, -hh, hw * 2, hh * 2, 7);
    });

    this.setAlpha(this.topupBtn, state.balance < state.stake ? 1 : 0.35);

    if (state.phase === 'ENDED') {
      this.idlePanel.setVisible(false);
      this.activeBar.setVisible(false);
      this.hopZone.disableInteractive();

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

    const tx = this.add.text(0, 0, label, {
      fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    container.add([bg, tx]);
    container.setSize(w, h);
    container.setInteractive();
    container.on('pointerdown', callback);
    container.setDepth(10);

    return container;
  }

  private setAlpha(container: Phaser.GameObjects.Container, alpha: number): void {
    container.setAlpha(alpha);
  }
}
