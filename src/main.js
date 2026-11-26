import './workspace/style.css';
import './workspace/flowork.css';
import './auth/access.css';
import { startApplication } from './auth/application.js';
import { createBackend } from './auth/backend.js';

startApplication(createBackend());
