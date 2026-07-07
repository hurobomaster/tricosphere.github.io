export const actuatorConfig = [
  {
    name: 'act_1_1',
    joint: 'joint_1_1',
    minRad: -0.576,
    maxRad: 3.72,
    defaultRad: 0,
  },
  {
    name: 'act_2_1',
    joint: 'joint_2_1',
    minRad: -2.147,
    maxRad: 2.147,
    defaultRad: 0,
  },
  {
    name: 'act_3_1',
    joint: 'joint_3_1',
    minRad: -2.147,
    maxRad: 2.147,
    defaultRad: 0,
  },
  {
    name: 'act_4_1',
    joint: 'joint_4_1',
    minRad: -0.576,
    maxRad: 3.72,
    defaultRad: 0,
  },
];

export const radToDeg = (rad) => rad * 180 / Math.PI;
export const degToRad = (deg) => deg * Math.PI / 180;
