/** Synthetic browser-only world; never imports or updates a live database. */
import {seed} from '../lib/world.ts';
import {initializeLiving,population} from '../lib/living/engine.ts';
import {animalRoster} from '../lib/life.ts';
const count=Number(process.argv[2]??48);if(![48,120,240].includes(count))throw Error('Density fixture must be 48,120 or240');
const now=Date.now(),world=structuredClone(seed);world.born=new Date(now-86400000).toISOString();world.living=initializeLiving(now);world.living.startedOn='2020-01-01';world.living.catalog.maxPopulation=count;world.living.residents=population(world.living,'2026-10-29');world.living.ecologyVersion=1;
world.clock={scale:1,pausedAt:null,pausedMs:0,anchors:[{realMs:now,simMs:43200000,scale:1}]};
for(const p of world.people)p.plan={createdAt:new Date(now).toISOString(),simStartedAt:43199000,pausedMs:0,from:'Công viên',steps:[{location:'Công viên',kind:'read',activity:'Đọc sách trong vườn',duration:3600}]};
if(process.argv.includes('--animals'))for(const a of animalRoster(world)){world.living.animalLearning??={};world.living.animalLearning[a.id]={samples:0,actions:{},energy:80,plan:{createdAt:new Date(now).toISOString(),simStartedAt:43200000,pausedMs:0,from:'Công viên',steps:[{location:'Công viên',kind:'rest',activity:'Nghỉ trong bóng mát',duration:3600}]}};}
if(process.argv.includes('--animals'))world.people[0].plan.steps[0]={location:'Công viên',kind:'walk-pet',activity:'Dạo cùng Cún trong công viên',duration:3600};
console.log(JSON.stringify({world,events:[],revision:1,serverNow:new Date(now).toISOString(),weatherState:{kind:'clear',intensity:0,label:'Synthetic preview'}}));
