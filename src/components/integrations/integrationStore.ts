import { invoke } from '@tauri-apps/api/core';
import { ServiceId, ServiceState, McpServerConfig, TestResult } from './types';

// Credentials and connections live only in memory. Never serialize tokens, headers or env to browser storage.
const states = new Map<ServiceId,ServiceState>();
const generations = new Map<string,number>();
function next(id:string){const revision=(generations.get(id)??0)+1;generations.set(id,revision);return revision;}
function check(id:string,revision:number){if(generations.get(id)!==revision)throw new Error('Connection cancelled.');}
const servers = new Map<string,McpServerConfig>();
const subscribers = new Set<(states:Record<ServiceId,ServiceState>)=>void>();
export function getServiceState(id:ServiceId):ServiceState {return states.get(id) ?? {id,isConnected:false,tools:[]};}
export function getAllServiceStates():Record<ServiceId,ServiceState> {return Object.fromEntries(states) as Record<ServiceId,ServiceState>;}
function notify(){const current=getAllServiceStates();subscribers.forEach(callback=>callback(current));}
export function subscribeIntegrations(callback:(states:Record<ServiceId,ServiceState>)=>void){subscribers.add(callback);return ()=>{subscribers.delete(callback);};}
export function getMcpServers():McpServerConfig[]{return [...servers.values()];}
const custom = new Map<string,{config:McpServerConfig;result?:TestResult}>();
export function getCustomMcpServers(){return [...custom.values()];}
export function saveCustomMcpServer(config:McpServerConfig){
  if(!config.id.startsWith('custom-'))throw new Error('Invalid custom server ID.');
  if(servers.has(config.id))throw new Error('Disconnect this server before editing.');
  custom.set(config.id,{config});notify();
}
export async function connectCustomMcpServer(config:McpServerConfig):Promise<TestResult>{
  const revision=next(config.id);
  const result=await invoke<TestResult>('test_mcp_server',{config});
  check(config.id,revision);
  custom.set(config.id,{config,result});
  if(result.success)servers.set(config.id,config);
  notify();return result;
}
export async function disconnectCustomMcpServer(id:string,remove=false){
  const attempted=generations.has(id);
  next(id);if(attempted||servers.has(id))await invoke('disconnect_mcp_server',{id});servers.delete(id);
  const entry=custom.get(id);
  if(remove)custom.delete(id);else if(entry)custom.set(id,{config:entry.config});
  notify();
}
export async function connectService(id:ServiceId,config:McpServerConfig):Promise<TestResult>{
  const revision=next(id);
  const result=await invoke<TestResult>('test_mcp_server',{config});
  check(id,revision);
  states.set(id,{id,isConnected:result.success,config:result.success?config:undefined,tools:result.tools,lastStatusMessage:result.message});
  if(result.success) servers.set(config.id,config);
  notify();return result;
}
export async function authorizeService(id:ServiceId,config:McpServerConfig):Promise<{url:string;complete:()=>Promise<TestResult>}>{
  const revision=next(id);
  const result=await invoke<{authId:string;authorizationUrl:string}>('begin_mcp_authorization',{config});
  check(id,revision);
  return {url:result.authorizationUrl,complete:async()=>{
    const connected=await invoke<TestResult>('complete_mcp_authorization',{authId:result.authId});
    check(id,revision);
    states.set(id,{id,isConnected:true,config,tools:connected.tools,lastStatusMessage:connected.message});servers.set(config.id,config);notify();return connected;
  }};
}
export async function disconnectService(id:ServiceId){
  next(id);
  const config=states.get(id)?.config;
  await invoke('disconnect_mcp_server',{id:config?.id??id});
  if(config)servers.delete(config.id);states.delete(id);notify();
}
