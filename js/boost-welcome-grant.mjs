// Staging-only WELCOME BOOST grant planning. This is NOT a database mutation.
// The database must atomically enforce one grant per account and campaign.
import {BOOST_TYPES,BOOST_CAP} from './boost-rules.mjs';
export const WELCOME_BOOST_CAMPAIGN='welcome-boost-v1';
export function planWelcomeBoostGrant(inventory,{alreadyGranted=false}={}){
 if(!inventory||typeof inventory!=='object'||Array.isArray(inventory)||typeof alreadyGranted!=='boolean'||
  BOOST_TYPES.some(type=>!Number.isInteger(inventory[type])||inventory[type]<0||inventory[type]>BOOST_CAP))
  throw new TypeError('Verified inventory and grant state required');
 const grant=Object.fromEntries(BOOST_TYPES.map(type=>[type,alreadyGranted?0:Math.min(1,BOOST_CAP-inventory[type])]));
 return Object.freeze({campaign:WELCOME_BOOST_CAMPAIGN,alreadyGranted,grant:Object.freeze(grant),
  resultingInventory:Object.freeze(Object.fromEntries(BOOST_TYPES.map(type=>[type,inventory[type]+grant[type]])))});
}
