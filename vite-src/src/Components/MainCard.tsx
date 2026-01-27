import React, { useState } from 'react';

// export CardItem so other components can read the data
export const CardItem = [
	{
		id: 1,
		name: 'Process Patient',
		description: 'Click to add/edit/delete patient.',
		ImgSrc: 'https://img.icons8.com/?size=100&id=123500&format=png&color=000000',
		Link: 'https://example.com',
		param: {},
		color: '#FF6B6B'
	},
	{
		id: 2,
		name: 'View Reports',
		description: 'Click to view patient reports.',
		ImgSrc: 'https://img.icons8.com/?size=100&id=DXNqXpTuOYm0&format=png&color=000000',
		Link: 'https://example.com',
		param: {},
		color: '#4D96FF'
	},
	{
		id: 3,
		name: 'Search Patient',
		description: 'Click to search patient.',
		ImgSrc: 'https://img.icons8.com/?size=100&id=114896&format=png&color=000000',
		Link: 'https://example.com',
		param: {},
		color: '#d77607ff'
	}
]

type MainCardProps = {
	onNavigate?: (id: number) => void
}

const MainCard: React.FC<MainCardProps> = ({ onNavigate }) => {
	const [hovered, setHovered] = useState<number | null>(null);

	// helper: convert hex like "#RRGGBB" or "#RGB" to {r,g,b}
	const hexToRgb = (hex: string) => {
		const clean = hex.replace('#', '');
		const full = clean.length === 3
			? clean.split('').map(c => c + c).join('')
			: clean;
		const r = parseInt(full.slice(0, 2), 16);
		const g = parseInt(full.slice(2, 4), 16);
		const b = parseInt(full.slice(4, 6), 16);
		return { r, g, b };
	};

	const containerStyle: React.CSSProperties = {
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 24,
		padding: 24,
		direction: 'ltr'
	};

	const baseCardStyle: React.CSSProperties = {
		width: 260,
		minHeight: 220,
		padding: 18,
		borderRadius: 16,
		transition: 'transform 240ms ease, box-shadow 240ms ease',
		boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
		cursor: 'pointer',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		textAlign: 'center',
		overflow: 'hidden'
	};

	const imgStyle: React.CSSProperties = {
		width: 96,
		height: 96,
		borderRadius: 12,
		objectFit: 'cover',
		marginBottom: 12,
	};

	const titleStyle: React.CSSProperties = {
		fontSize: 18,
		margin: '6px 0',
		color: '#0f172a'
	};

	const descStyle: React.CSSProperties = {
		fontSize: 15,
		color: '#163a4eff',
		marginBottom: 12
	};

	return (
		<div style={containerStyle}>
			{CardItem.map((item) => {
				const isHovered = hovered === item.id;
				// compute color variants
				const { r, g, b } = hexToRgb(item.color || '#2563eb');
				const bg = `linear-gradient(180deg, rgba(${r},${g},${b},0.10), rgba(${r},${g},${b},0.03))`;
				const border = `1px solid rgba(${r},${g},${b},0.12)`;
				const ctaBg = `linear-gradient(90deg, rgba(${r},${g},${b},0.95), rgba(${Math.min(r+40,255)},${Math.min(g+20,255)},${Math.min(b+60,255)},0.95))`;

				const cardStyle: React.CSSProperties = {
					...baseCardStyle,
					background: bg,
					border,
					transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0)',
					boxShadow: isHovered
						? `0 16px 40px rgba(${r},${g},${b},0.18)`
						: baseCardStyle.boxShadow
				};

				const linkStyle: React.CSSProperties = {
					marginTop: 'auto',
					padding: '8px 14px',
					borderRadius: 10,
					background: ctaBg,
					color: '#fff',
					textDecoration: 'none',
					fontWeight: 600,
					fontSize: 13,
					boxShadow: `0 6px 18px rgba(${r},${g},${b},0.18)`
				};

				return (
					<div
						key={item.id}
						style={cardStyle}
						onMouseEnter={() => setHovered(item.id)}
						onMouseLeave={() => setHovered(null)}
						role="button"
						aria-label={item.name}
					>
						<img src={item.ImgSrc} alt={item.name} style={imgStyle} />
						<h2 style={titleStyle}>{item.name}</h2>
						<p style={descStyle}>{item.description}</p>

						{/* CTA now triggers onNavigate if provided */}
						<a
							href={item.Link}
							onClick={(e) => { e.preventDefault(); onNavigate?.(item.id); }}
							style={linkStyle}
						>
							{"<-"} GoTo
						</a>
					</div>
				);
			})}
		</div>
	);
}

export default MainCard;
