import React from 'react';

const _path = `M 0 0 L 80 0 C 105 0 105 50 80 50
               L 20 50 L 20 100 L 0 100 L 0 0 Z
               M 20 15 L 70 15 C 80 15 80 35 70 35 L 20 35 L 20 15 Z`;

export const P = props => (
    <g>
        <path {...props} d={_path} fillRule="evenodd"/>
    </g>
);
