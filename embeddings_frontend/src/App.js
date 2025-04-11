import React from "react";
import FileUpload from "./components/FileUpload";
import Search from "./components/Search";

const App = () => {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Semantic Search Portal</h1>
      <FileUpload />
      <hr />
      <Search />
    </div>
  );
};

export default App;
