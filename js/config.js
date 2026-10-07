(function(root){
'use strict';
const CONFIG={
 RULESET:"prime-v031-standard",
 GAME_DURATION:60, COUNTDOWN_SECONDS:3, FIXED_STEP:1/120, MAX_FRAME_DELTA:0.1,
 WORLD_WIDTH:1000, WORLD_HEIGHT:620, GROUND_Y:520, FIELD_MARGIN:42,
 PLAYER_SPEED:280, PLAYER_ACCELERATION:3000, PLAYER_DECELERATION:3000,
 PLAYER_JUMP_POWER:390, GRAVITY:1100, SPIN_DURATION:0.30, SPIN_MOVE_FACTOR:0.2,
 ACTION_COOLDOWN:0.19, ACTION_DURATION:0.23, LAND_DURATION:0.15,
 KNEE_ANIMATION:{duration:0.34,holdFraction:0.28,contactOffset:12,forward:26,shinDrop:30,shinBack:18,toeAngle:0.85},
 BALL_GRAVITY:700, BALL_RADIUS:11, BALL_MAX_HORIZONTAL_SPEED:210, CONTACT_EDGE_LIFT_LOSS:0.12,
 BALL_SPAWN_HEIGHT:290, BALL_SPAWN_VX:38, RESPAWN_DELAY:0.85,
 SPIN_BONUS:300, MAX_SPIN_BONUSES:2,
 ACTIONS:{
  FOOT:{height:18,offsetX:19,contactRadius:25,verticalVelocity:620,horizontalInfluence:6.5,moveInfluence:0.14,score:100},
  KNEE:{height:72,offsetX:13,contactRadius:23,verticalVelocity:550,horizontalInfluence:6.0,moveInfluence:0.12,score:150},
  CHEST:{height:99,offsetX:0,contactRadius:25,verticalVelocity:430,horizontalInfluence:5.5,moveInfluence:0.1,score:200},
  HEADER:{height:143,offsetX:0,contactRadius:24,verticalVelocity:460,horizontalInfluence:6.0,moveInfluence:0.1,score:250},
  JUMP_HEADER:{height:143,offsetX:0,contactRadius:24,verticalVelocity:510,horizontalInfluence:7.0,moveInfluence:0.12,score:500}
 }
};
root.PRIME_DEFAULTS=JSON.parse(JSON.stringify(CONFIG));root.PRIME_CONFIG=CONFIG;
})(globalThis);
