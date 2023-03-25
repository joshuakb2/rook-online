import React, { CSSProperties } from 'react';
import { Card, Color } from '../../common/parsers';
import { assertNever } from '../../common/utils';

export type CardSvgProps = {
    card?: Card;
    trumps?: Color;
    style?: CSSProperties;
    onClick?: () => void;
};

export const CardSvg = ({ card, trumps = 'black', style, onClick }: CardSvgProps) => {
    if (!card) return <BackOfCard {...{ style }}/>

    const color = getColorCode(card.rook ? trumps : card.color);

    return <svg
        viewBox='0 0 510 710'
        xmlns='http://www.w3.org/2000/svg'
        style={{ userSelect: 'none', ...style }}
        className={onClick ? 'dimOnHover' : undefined}
        onClick={onClick}
    >
        {borderAndBackground}
        {card.rook
            // Rook image
            ? <>
                <image x='100' y='225' width='300' href='assets/Raven-Silhouette.svg'/>
                <text
                    x='60'
                    y='130'
                    dominantBaseline='middle'
                    textAnchor='middle'
                    stroke={color}
                    fill={color}
                    style={{
                        fontSize: '60px',
                        fontWeight: 'bold',
                    }}
                    transform='rotate(-90, 60, 130)'
                >ROOK</text>
                <text
                    x='450'
                    y='580'
                    dominantBaseline='middle'
                    textAnchor='middle'
                    stroke={color}
                    fill={color}
                    style={{
                        fontSize: '60px',
                        fontWeight: 'bold',
                    }}
                    transform='rotate(90, 450, 580)'
                >ROOK</text>
            </>

            // Numbers
            : <>
                <text
                    x='70'
                    y='70'
                    dominantBaseline='middle'
                    textAnchor='middle'
                    stroke={color}
                    fill={color}
                    style={{
                        fontSize: '100px',
                        fontWeight: 'bold',
                    }}
                >{card.number}</text>
                <text
                    x='440'
                    y='640'
                    dominantBaseline='middle'
                    textAnchor='middle'
                    stroke={color}
                    fill={color}
                    style={{
                        fontSize: '100px',
                        fontWeight: 'bold',
                    }}
                    transform='rotate(180 440 640)'
                >{card.number}</text>
                <text
                    x='50%'
                    y='50%'
                    dominantBaseline='middle'
                    textAnchor='middle'
                    stroke={color}
                    fill={color}
                    style={{
                        fontSize: '300px',
                        fontWeight: 'bold',
                    }}
                >{card.number}</text>
            </>
        }
    </svg>;
};

const getColorCode = (color: Color): string => {
    switch (color) {
        case 'black': return 'black';
        case 'red': return 'red';
        case 'green': return 'green';
        case 'yellow': return '#bb0';
        default: return assertNever(color);
    }
}

const BackOfCard = ({ style }: { style?: CSSProperties }) => {
    return <svg
        viewBox='0 0 510 710'
        xmlns='http://www.w3.org/2000/svg'
        style={{ userSelect: 'none', ...style }}
    >
        {borderAndBackground}
        {backOfCardFill}
    </svg>
};

const borderPath = 'M 55 5 l 400 0 a 50 50 0 0 1 50 50 l 0 600 a 50 50 0 0 1 -50 50 l -400 0 a 50 50 0 0 1 -50 -50 l 0 -600 a 50 50 0 0 1 50 -50';

const borderAndBackground = <path
    style={{
        fill: '#fffff0',
        stroke: 'black',
        strokeWidth: 5,
    }}
    d={borderPath}
/>;

const backOfCardFill = <>
    <clipPath id="clip">
        <path d={borderPath}/>
    </clipPath>
    <g clipPath='url(#clip)'>
        {/* Blue cells */}
        <rect x='5' y='5' width='500' height='700' fill='#004'/>
        {/* Black cells */}
        <rect x='5' y='5' width='50' height='50' fill='#77f'/>
        <rect x='105' y='5' width='50' height='50' fill='#77f'/>
        <rect x='205' y='5' width='50' height='50' fill='#77f'/>
        <rect x='305' y='5' width='50' height='50' fill='#77f'/>
        <rect x='405' y='5' width='50' height='50' fill='#77f'/>
        <rect x='55' y='55' width='50' height='50' fill='#77f'/>
        <rect x='155' y='55' width='50' height='50' fill='#77f'/>
        <rect x='255' y='55' width='50' height='50' fill='#77f'/>
        <rect x='355' y='55' width='50' height='50' fill='#77f'/>
        <rect x='455' y='55' width='50' height='50' fill='#77f'/>
        <rect x='5' y='105' width='50' height='50' fill='#77f'/>
        <rect x='105' y='105' width='50' height='50' fill='#77f'/>
        <rect x='205' y='105' width='50' height='50' fill='#77f'/>
        <rect x='305' y='105' width='50' height='50' fill='#77f'/>
        <rect x='405' y='105' width='50' height='50' fill='#77f'/>
        <rect x='55' y='155' width='50' height='50' fill='#77f'/>
        <rect x='155' y='155' width='50' height='50' fill='#77f'/>
        <rect x='255' y='155' width='50' height='50' fill='#77f'/>
        <rect x='355' y='155' width='50' height='50' fill='#77f'/>
        <rect x='455' y='155' width='50' height='50' fill='#77f'/>
        <rect x='5' y='205' width='50' height='50' fill='#77f'/>
        <rect x='105' y='205' width='50' height='50' fill='#77f'/>
        <rect x='205' y='205' width='50' height='50' fill='#77f'/>
        <rect x='305' y='205' width='50' height='50' fill='#77f'/>
        <rect x='405' y='205' width='50' height='50' fill='#77f'/>
        <rect x='55' y='255' width='50' height='50' fill='#77f'/>
        <rect x='155' y='255' width='50' height='50' fill='#77f'/>
        <rect x='255' y='255' width='50' height='50' fill='#77f'/>
        <rect x='355' y='255' width='50' height='50' fill='#77f'/>
        <rect x='455' y='255' width='50' height='50' fill='#77f'/>
        <rect x='5' y='305' width='50' height='50' fill='#77f'/>
        <rect x='105' y='305' width='50' height='50' fill='#77f'/>
        <rect x='205' y='305' width='50' height='50' fill='#77f'/>
        <rect x='305' y='305' width='50' height='50' fill='#77f'/>
        <rect x='405' y='305' width='50' height='50' fill='#77f'/>
        <rect x='55' y='355' width='50' height='50' fill='#77f'/>
        <rect x='155' y='355' width='50' height='50' fill='#77f'/>
        <rect x='255' y='355' width='50' height='50' fill='#77f'/>
        <rect x='355' y='355' width='50' height='50' fill='#77f'/>
        <rect x='455' y='355' width='50' height='50' fill='#77f'/>
        <rect x='5' y='405' width='50' height='50' fill='#77f'/>
        <rect x='105' y='405' width='50' height='50' fill='#77f'/>
        <rect x='205' y='405' width='50' height='50' fill='#77f'/>
        <rect x='305' y='405' width='50' height='50' fill='#77f'/>
        <rect x='405' y='405' width='50' height='50' fill='#77f'/>
        <rect x='55' y='455' width='50' height='50' fill='#77f'/>
        <rect x='155' y='455' width='50' height='50' fill='#77f'/>
        <rect x='255' y='455' width='50' height='50' fill='#77f'/>
        <rect x='355' y='455' width='50' height='50' fill='#77f'/>
        <rect x='455' y='455' width='50' height='50' fill='#77f'/>
        <rect x='5' y='505' width='50' height='50' fill='#77f'/>
        <rect x='105' y='505' width='50' height='50' fill='#77f'/>
        <rect x='205' y='505' width='50' height='50' fill='#77f'/>
        <rect x='305' y='505' width='50' height='50' fill='#77f'/>
        <rect x='405' y='505' width='50' height='50' fill='#77f'/>
        <rect x='55' y='555' width='50' height='50' fill='#77f'/>
        <rect x='155' y='555' width='50' height='50' fill='#77f'/>
        <rect x='255' y='555' width='50' height='50' fill='#77f'/>
        <rect x='355' y='555' width='50' height='50' fill='#77f'/>
        <rect x='455' y='555' width='50' height='50' fill='#77f'/>
        <rect x='5' y='605' width='50' height='50' fill='#77f'/>
        <rect x='105' y='605' width='50' height='50' fill='#77f'/>
        <rect x='205' y='605' width='50' height='50' fill='#77f'/>
        <rect x='305' y='605' width='50' height='50' fill='#77f'/>
        <rect x='405' y='605' width='50' height='50' fill='#77f'/>
        <rect x='55' y='655' width='50' height='50' fill='#77f'/>
        <rect x='155' y='655' width='50' height='50' fill='#77f'/>
        <rect x='255' y='655' width='50' height='50' fill='#77f'/>
        <rect x='355' y='655' width='50' height='50' fill='#77f'/>
        <rect x='455' y='655' width='50' height='50' fill='#77f'/>
    </g>
    <text
        x='50%'
        y='50%'
        fill='white'
        stroke='white'
        dominantBaseline='middle'
        textAnchor='middle'
        style={{
            fontSize: '300px',
        }}
    >M</text>
</>;
