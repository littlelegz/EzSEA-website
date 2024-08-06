import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./navbar.css"; // Make sure to create this file for styling

const Navbar = () => {
  const [isMobile, setIsMobile] = useState(false);

  return (
    <nav className="navbar">
      <h1 className="logo">ReactVis</h1>
      <ul
        className={isMobile ? "nav-links-mobile" : "nav-links"}
        onClick={() => setIsMobile(false)}
      >
        <Link to="/" className="home">
          <li>Home</li>
        </Link>
        <Link to="/tol" className="tol">
          <li>Tree of Life</li>
        </Link>
        <Link to="/pv" className="pv">
          <li>Protein Viewer</li>
        </Link>
        <Link to="/prlogo" className="prlogo">
          <li>Seq Logo</li>
        </Link>
      </ul>
      <button
        className="mobile-menu-icon"
        onClick={() => setIsMobile(!isMobile)}
      >
        {isMobile ? (
          <i className="fas fa-times"></i>
        ) : (
          <i className="fas fa-bars"></i>
        )}
      </button>
    </nav>
  );
};

export default Navbar;
