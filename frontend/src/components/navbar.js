/**
 * navbar.js
 * This file contains the code for the navbar
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./navbar.css"; // Make sure to create this file for styling

const Navbar = (options) => {

  return (
    <div className="navbar">
      {options.pageId ? (
        <div className="nav-links">
          <Link to="/">
            <h1 className="logo">{options.pageId}</h1>
          </Link>
        </div>
      ) : (
        <div className="nav-links">
          <Link to="/">
            <h1 className="logo">EzSEA</h1>
          </Link>
        </div>
      )
      }
      <ul
        className={"nav-links"}
      >
        <Link to="/about" className="about">
          <li>About</li>
        </Link>
        <Link to="/help" className="help">
          <li>Help</li>
        </Link>
      </ul>
    </div>
  );
};

export default Navbar;
