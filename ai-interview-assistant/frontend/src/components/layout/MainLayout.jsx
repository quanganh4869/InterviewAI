import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "./MainLayout.css";

const MainLayout = ({ children }) => {
  return (
    <div className="main-layout">
      <Sidebar />
      <div className="main-content-wrapper">
        <Header />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
