import { addStartupSystem, addSystemToSchedule, Schedule } from 'esengine';

import './components';
import { setupSystem } from './systems/setup';
import {
    collideSystem,
    hazardSystem,
    layoutSystem,
    moveSystem,
    restartSystem,
    starSystem,
} from './systems/play';
import { hudSystem } from './systems/hud';

addStartupSystem(setupSystem);
addSystemToSchedule(Schedule.Update, layoutSystem);
addSystemToSchedule(Schedule.Update, moveSystem);
addSystemToSchedule(Schedule.Update, hazardSystem);
addSystemToSchedule(Schedule.Update, collideSystem);
addSystemToSchedule(Schedule.Update, starSystem);
addSystemToSchedule(Schedule.Update, restartSystem);
addSystemToSchedule(Schedule.Update, hudSystem);
