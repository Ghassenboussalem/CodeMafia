import React from 'react';

export default function AssigningScreen() {
  return (
    <div
      className="screen-assigning"
      style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}
    >
      <div className="assigning-text">Assigning roles...</div>
    </div>
  );
}
