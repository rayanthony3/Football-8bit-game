export const CFG = {
  WIDTH: 800,
  HEIGHT: 480,
  FIELD_WORLD_W: 3200,
  FIELD_WORLD_H: 480,

  YARD_PX: 27,
  EZ_W: 130,

  // Perspective field (screen Y of sidelines)
  FIELD_FAR_Y:  105,
  FIELD_NEAR_Y: 345,
  FIELD_FAR_HASH_Y:  162,
  FIELD_NEAR_HASH_Y: 288,

  // Player scaling by depth
  SCALE_FAR:  0.60,
  SCALE_NEAR: 1.10,

  // Game speeds (ms)
  PLAY_ANIM_MS: 1600,
  RESULT_LINGER_MS: 2800,
  BETWEEN_PLAY_MS: 1200,

  QUARTER_SECONDS: 120,
  PLAY_CLOCK: 30,

  PLAYER_W: 22,
  PLAYER_H: 34,
  BALL_W: 10,
  BALL_H: 6,

  GAME_MODES: {
    PLAYER: 'PLAYER',  // control your chosen position
    COACH:  'COACH',   // call plays, watch CPU execute
    SIM:    'SIM',     // full CPU sim, spectate only
  },

  COLORS: {
    SKY:          0x0d1b2a,
    FIELD:        0x4a9a32,
    FIELD_ALT:    0x3e8229,
    LINE:         0xffffff,
    HASH:         0xbbbbbb,
    ENDZONE_A:    0x1a3a8a,
    ENDZONE_B:    0x8b0000,
    BALL:         0x8b4513,
    BALL_STRIPE:  0xffffff,
    CROWD_FAR:    0x1a1428,
    CROWD_NEAR:   0x1a1428,
    UI_BG:        0x080810,
    GOLD:         0xffd700,
    CYAN:         0x00ffff,
    GREEN_HI:     0x00ff88,
    RED_HI:       0xff4444,
    GRAY:         0x888888,
    SKIN:         0xd4a574,
  },

  TEAM_A: {
    name: 'Ironclad FC',
    city: 'IRON CITY',
    abbr: 'IFC',
    primary:   0x1a3a8a,
    secondary: 0xffd700,
    textColor: '#ffd700',
  },
  TEAM_B: {
    name: 'Red Storm',
    city: 'STORM BAY',
    abbr: 'STM',
    primary:   0x8b0000,
    secondary: 0xc8c8c8,
    textColor: '#c8c8c8',
  },

  POSITIONS: {
    QB:  { label:'QB',  name:'Quarterback',       side:'OFF', slots:3 },
    RB:  { label:'RB',  name:'Running Back',       side:'OFF', slots:4 },
    FB:  { label:'FB',  name:'Fullback',           side:'OFF', slots:1 },
    WR:  { label:'WR',  name:'Wide Receiver',      side:'OFF', slots:6 },
    TE:  { label:'TE',  name:'Tight End',          side:'OFF', slots:3 },
    LT:  { label:'LT',  name:'Left Tackle',        side:'OFF', slots:2 },
    LG:  { label:'LG',  name:'Left Guard',         side:'OFF', slots:2 },
    C:   { label:'C',   name:'Center',             side:'OFF', slots:2 },
    RG:  { label:'RG',  name:'Right Guard',        side:'OFF', slots:2 },
    RT:  { label:'RT',  name:'Right Tackle',       side:'OFF', slots:2 },
    DE:  { label:'DE',  name:'Defensive End',      side:'DEF', slots:4 },
    DT:  { label:'DT',  name:'Defensive Tackle',   side:'DEF', slots:3 },
    MLB: { label:'MLB', name:'Middle Linebacker',  side:'DEF', slots:2 },
    OLB: { label:'OLB', name:'Outside Linebacker', side:'DEF', slots:4 },
    CB:  { label:'CB',  name:'Cornerback',         side:'DEF', slots:6 },
    FS:  { label:'FS',  name:'Free Safety',        side:'DEF', slots:2 },
    SS:  { label:'SS',  name:'Strong Safety',      side:'DEF', slots:2 },
    K:   { label:'K',   name:'Kicker',             side:'ST',  slots:1 },
    P:   { label:'P',   name:'Punter',             side:'ST',  slots:1 },
  },

  STAT_LABELS: {
    spd:'Speed', str:'Strength', awr:'Awareness', agi:'Agility', stm:'Stamina',
    thr:'Throw Power', acc:'Accuracy', ctc:'Catching', rtr:'Route Run',
    blk:'Blocking', tck:'Tackling', cvr:'Coverage', kpw:'Kick Power', kac:'Kick Acc',
  },

  // Offense formation: yardOffset (<0 = behind LOS), fieldY (-1=far sideline, +1=near sideline)
  OFF_FORMATION: [
    { pos:'LT',  yardOff: 0,    fieldY:-0.32 },
    { pos:'LG',  yardOff: 0,    fieldY:-0.15 },
    { pos:'C',   yardOff: 0,    fieldY: 0    },
    { pos:'RG',  yardOff: 0,    fieldY: 0.15 },
    { pos:'RT',  yardOff: 0,    fieldY: 0.32 },
    { pos:'TE',  yardOff: 0,    fieldY: 0.50 },
    { pos:'QB',  yardOff:-4.5,  fieldY: 0    },
    { pos:'FB',  yardOff:-5.5,  fieldY: 0.08 },
    { pos:'RB',  yardOff:-7,    fieldY: 0.18 },
    { pos:'WR',  yardOff:-1,    fieldY:-0.83 },
    { pos:'WR',  yardOff:-1,    fieldY: 0.86 },
  ],

  // Defense formation: yardOffset (>0 = ahead of LOS, toward offense's endzone)
  DEF_FORMATION: [
    { pos:'DE',  yardOff: 1.2,  fieldY:-0.36 },
    { pos:'DT',  yardOff: 1.2,  fieldY:-0.13 },
    { pos:'DT',  yardOff: 1.2,  fieldY: 0.13 },
    { pos:'DE',  yardOff: 1.2,  fieldY: 0.36 },
    { pos:'OLB', yardOff: 4.5,  fieldY:-0.48 },
    { pos:'MLB', yardOff: 4.5,  fieldY: 0    },
    { pos:'OLB', yardOff: 4.5,  fieldY: 0.48 },
    { pos:'CB',  yardOff: 1.0,  fieldY:-0.86 },
    { pos:'CB',  yardOff: 1.0,  fieldY: 0.88 },
    { pos:'FS',  yardOff:11,    fieldY:-0.28 },
    { pos:'SS',  yardOff: 9,    fieldY: 0.32 },
  ],

  OFFENSE_PLAYS: [
    { id:'iz', name:'Inside Zone',   type:'RUN',  desc:'RB hits inside gap',         icon:'run'  },
    { id:'oz', name:'Outside Zone',  type:'RUN',  desc:'RB sweeps to the outside',   icon:'run'  },
    { id:'pw', name:'Power',         type:'RUN',  desc:'FB leads through the hole',  icon:'run'  },
    { id:'ct', name:'Counter',       type:'RUN',  desc:'Cut opposite on delay',      icon:'run'  },
    { id:'qk', name:'QB Sneak',      type:'RUN',  desc:'QB sneaks behind center',    icon:'run'  },
    { id:'sl', name:'Slant',         type:'PASS', desc:'WR slants inside',           icon:'pass' },
    { id:'cu', name:'Curl',          type:'PASS', desc:'WR curls back to QB',        icon:'pass' },
    { id:'ps', name:'Post',          type:'PASS', desc:'Deep post downfield',        icon:'pass' },
    { id:'cr', name:'Cross',         type:'PASS', desc:'WR crosses the middle',      icon:'pass' },
    { id:'sc', name:'Screen',        type:'PASS', desc:'RB screen behind blockers',  icon:'pass' },
    { id:'pa', name:'Play Action',   type:'PASS', desc:'Fake run, then pass',        icon:'pass' },
    { id:'fl', name:'Fly Route',     type:'PASS', desc:'WR sprints deep',            icon:'pass' },
    { id:'fg', name:'Field Goal',    type:'KICK', desc:'Attempt a field goal',       icon:'kick' },
    { id:'pu', name:'Punt',          type:'KICK', desc:'Punt the ball downfield',    icon:'kick' },
  ],

  DEFENSE_PLAYS: [
    { id:'c1', name:'Cover 1',   type:'COVERAGE', desc:'Man coverage, 1 deep safety'  },
    { id:'c2', name:'Cover 2',   type:'COVERAGE', desc:'Zone, 2 deep safeties'        },
    { id:'c3', name:'Cover 3',   type:'COVERAGE', desc:'Zone, 3 deep defenders'       },
    { id:'c4', name:'Cover 4',   type:'COVERAGE', desc:'Prevent — 4 deep'             },
    { id:'bl', name:'MLB Blitz', type:'BLITZ',    desc:'MLB rushes the passer'        },
    { id:'db', name:'DB Blitz',  type:'BLITZ',    desc:'Corner or Safety blitzes'     },
    { id:'gl', name:'Goal Line', type:'FRONT',    desc:'6-man goal line front'        },
    { id:'nk', name:'Nickel',    type:'FRONT',    desc:'5 DBs vs pass formations'     },
  ],
};
