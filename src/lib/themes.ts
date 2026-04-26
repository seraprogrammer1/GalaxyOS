export type ThemeId = 'light-cosmic' | 'dark' | 'zootopia' | 'steven-universe' | 'home-movie';

export interface ThemeDefinition {
	id: ThemeId;
	label: string;
	mode: 'light' | 'dark';
	vars: Record<string, string>;
	swatches: [string, string, string, string];
}

export const THEME_IDS: ThemeId[] = [
	'light-cosmic',
	'dark',
	'zootopia',
	'steven-universe',
	'home-movie'
];

export const THEMES: Record<ThemeId, ThemeDefinition> = {
	'light-cosmic': {
		id: 'light-cosmic',
		label: 'Light Cosmic',
		mode: 'light',
		swatches: ['#e8748a', '#9b72cf', '#fdf6f9', '#2a1428'],
		vars: {
			'--accent-primary': '#e8748a',
			'--accent-secondary': '#9b72cf',
			'--accent-primary-soft': 'rgba(232, 116, 138, 0.15)',
			'--accent-secondary-soft': 'rgba(155, 114, 207, 0.15)',
			'--bg-base': '#fdf6f9',
			'--bg-surface': 'rgba(255, 255, 255, 0.45)',
			'--bg-glass': 'rgba(255, 255, 255, 0.52)',
			'--bg-glass-border': 'rgba(255, 255, 255, 0.72)',
			'--bg-card': 'rgba(255, 255, 255, 0.52)',
			'--text-primary': '#2a1428',
			'--text-secondary': '#5e3050',
			'--text-muted': '#9d7a8a',
			'--shadow-soft':
				'0 8px 40px rgba(200, 120, 160, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.80)',
			'--shadow-card': '0 2px 20px rgba(180, 100, 140, 0.10)',
			'--gradient-bg':
				'linear-gradient(135deg, #fce4ec 0%, #f3e5f5 35%, #ede7f6 65%, #e8eaf6 100%)',
			'--orb-a-color': 'radial-gradient(circle, rgba(252, 180, 200, 0.50) 0%, transparent 65%)',
			'--orb-b-color': 'radial-gradient(circle, rgba(209, 180, 252, 0.45) 0%, transparent 65%)',
			'--orb-c-color': 'radial-gradient(circle, rgba(180, 198, 252, 0.35) 0%, transparent 65%)'
		}
	},

	dark: {
		id: 'dark',
		label: 'Dark',
		mode: 'dark',
		swatches: ['#e8748a', '#9b72cf', '#11131c', '#e1e1ef'],
		vars: {
			'--accent-primary': '#e8748a',
			'--accent-secondary': '#9b72cf',
			'--accent-primary-soft': 'rgba(232, 116, 138, 0.15)',
			'--accent-secondary-soft': 'rgba(155, 114, 207, 0.15)',
			'--bg-base': '#11131c',
			'--bg-surface': '#1d1f29',
			'--bg-glass': 'rgba(20, 22, 35, 0.72)',
			'--bg-glass-border': 'rgba(255, 255, 255, 0.07)',
			'--bg-card': 'rgba(18, 20, 32, 0.88)',
			'--text-primary': '#e1e1ef',
			'--text-secondary': '#d4c2c2',
			'--text-muted': '#9d8d8d',
			'--shadow-soft':
				'0 8px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
			'--shadow-card': '0 2px 20px rgba(0, 0, 0, 0.45)',
			'--gradient-bg':
				'linear-gradient(135deg, #1a0e1e 0%, #130d22 35%, #0e1020 65%, #0b0d18 100%)',
			'--orb-a-color': 'radial-gradient(circle, rgba(120, 40, 80, 0.45) 0%, transparent 65%)',
			'--orb-b-color': 'radial-gradient(circle, rgba(80, 40, 120, 0.40) 0%, transparent 65%)',
			'--orb-c-color': 'radial-gradient(circle, rgba(40, 60, 120, 0.35) 0%, transparent 65%)'
		}
	},

	zootopia: {
		id: 'zootopia',
		label: 'Zootopia',
		mode: 'light',
		swatches: ['#f5803e', '#9c5fc7', '#fdf5ed', '#2d1a0e'],
		vars: {
			'--accent-primary': '#f5803e',
			'--accent-secondary': '#9c5fc7',
			'--accent-primary-soft': 'rgba(245, 128, 62, 0.15)',
			'--accent-secondary-soft': 'rgba(156, 95, 199, 0.15)',
			'--bg-base': '#fdf5ed',
			'--bg-surface': 'rgba(255, 248, 238, 0.55)',
			'--bg-glass': 'rgba(255, 248, 238, 0.60)',
			'--bg-glass-border': 'rgba(255, 220, 180, 0.70)',
			'--bg-card': 'rgba(255, 248, 238, 0.60)',
			'--text-primary': '#2d1a0e',
			'--text-secondary': '#6b3d1e',
			'--text-muted': '#a5825a',
			'--shadow-soft':
				'0 8px 40px rgba(220, 130, 60, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.75)',
			'--shadow-card': '0 2px 20px rgba(200, 100, 40, 0.12)',
			'--gradient-bg':
				'linear-gradient(135deg, #fde8d0 0%, #f5dcf0 35%, #e8d8f5 65%, #f0e4d0 100%)',
			'--orb-a-color': 'radial-gradient(circle, rgba(245, 170, 100, 0.55) 0%, transparent 65%)',
			'--orb-b-color': 'radial-gradient(circle, rgba(200, 160, 240, 0.45) 0%, transparent 65%)',
			'--orb-c-color': 'radial-gradient(circle, rgba(255, 200, 140, 0.35) 0%, transparent 65%)'
		}
	},

	'steven-universe': {
		id: 'steven-universe',
		label: 'Steven Universe',
		mode: 'dark',
		swatches: ['#ff6fbd', '#2dc9b2', '#0f0a1e', '#f0e8ff'],
		vars: {
			'--accent-primary': '#ff6fbd',
			'--accent-secondary': '#2dc9b2',
			'--accent-primary-soft': 'rgba(255, 111, 189, 0.15)',
			'--accent-secondary-soft': 'rgba(45, 201, 178, 0.15)',
			'--bg-base': '#0f0a1e',
			'--bg-surface': 'rgba(30, 18, 52, 0.75)',
			'--bg-glass': 'rgba(30, 18, 52, 0.72)',
			'--bg-glass-border': 'rgba(255, 111, 189, 0.15)',
			'--bg-card': 'rgba(20, 12, 40, 0.88)',
			'--text-primary': '#f0e8ff',
			'--text-secondary': '#d4b8e0',
			'--text-muted': '#8876a8',
			'--shadow-soft':
				'0 8px 40px rgba(255, 111, 189, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
			'--shadow-card': '0 2px 20px rgba(45, 201, 178, 0.12)',
			'--gradient-bg':
				'linear-gradient(135deg, #1a0a28 0%, #0d1a30 35%, #0a2028 65%, #150a20 100%)',
			'--orb-a-color': 'radial-gradient(circle, rgba(255, 111, 189, 0.40) 0%, transparent 65%)',
			'--orb-b-color': 'radial-gradient(circle, rgba(45, 201, 178, 0.35) 0%, transparent 65%)',
			'--orb-c-color': 'radial-gradient(circle, rgba(120, 60, 200, 0.30) 0%, transparent 65%)'
		}
	},

	'home-movie': {
		id: 'home-movie',
		label: 'Home',
		mode: 'dark',
		swatches: ['#f0338a', '#00d4d4', '#070d1a', '#e8f4ff'],
		vars: {
			'--accent-primary': '#f0338a',
			'--accent-secondary': '#00d4d4',
			'--accent-primary-soft': 'rgba(240, 51, 138, 0.15)',
			'--accent-secondary-soft': 'rgba(0, 212, 212, 0.15)',
			'--bg-base': '#070d1a',
			'--bg-surface': 'rgba(10, 20, 40, 0.78)',
			'--bg-glass': 'rgba(10, 20, 40, 0.70)',
			'--bg-glass-border': 'rgba(0, 212, 212, 0.18)',
			'--bg-card': 'rgba(8, 16, 35, 0.90)',
			'--text-primary': '#e8f4ff',
			'--text-secondary': '#9ecadf',
			'--text-muted': '#5a8aaa',
			'--shadow-soft':
				'0 8px 40px rgba(0, 212, 212, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
			'--shadow-card': '0 2px 20px rgba(240, 51, 138, 0.12)',
			'--gradient-bg':
				'linear-gradient(135deg, #0a0d20 0%, #071220 35%, #060d1a 65%, #0a0a18 100%)',
			'--orb-a-color': 'radial-gradient(circle, rgba(240, 51, 138, 0.40) 0%, transparent 65%)',
			'--orb-b-color': 'radial-gradient(circle, rgba(0, 212, 212, 0.35) 0%, transparent 65%)',
			'--orb-c-color': 'radial-gradient(circle, rgba(60, 40, 160, 0.30) 0%, transparent 65%)'
		}
	}
};
