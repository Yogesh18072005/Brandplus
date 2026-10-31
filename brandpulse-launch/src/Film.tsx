import { DirectedFilm } from "./v2/Director";
import "./style.css";
import "./v2/cinema.css";
export const Film = ({ frame }: { frame: number }) => (
  <DirectedFilm frame={frame} />
);
