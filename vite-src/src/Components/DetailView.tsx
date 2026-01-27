import React from 'react';
import { CardItem } from './MainCard';

type Props = {
	id: number;
	onBack: () => void;
};

const DetailView: React.FC<Props> = ({ id, onBack }) => {
	const item = CardItem.find(i => i.id === id);
	if (!item) return (
		<div style={{ textAlign: 'center' }}>
			<p>Item not found</p>
			<button onClick={onBack}>Back</button>
		</div>
	);

	return (
		<div style={{ width: 420, padding: 24, borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.08)', textAlign: 'center' }}>
			<img src={item.ImgSrc} alt={item.name} style={{ width: 120, height: 120, borderRadius: 12, objectFit: 'cover' }} />
			<h2 style={{ marginTop: 12 }}>{item.name}</h2>
			<p style={{ color: '#475569' }}>{item.description}</p>
			<div style={{ marginTop: 18 }}>
				<button onClick={onBack} style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}>
					Back
				</button>
			</div>
		</div>
	);
};

export default DetailView;
