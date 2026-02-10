import { App } from './App';
import './style.scss';

const root = document.getElementById('app');
if (root) {
  const app = new App(root);
  app.init();
}
