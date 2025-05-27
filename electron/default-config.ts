import { CommandStream, PlaceholderType } from "@/types/command";
import { DBConfigSettings } from "@/types/db-config";
import { ConnectionData } from "@/types/connection";
import { SQLOrCommandData } from "@/types/sql-or-command";

export const DEFAULT_COMMAND_STREAMS: CommandStream[] = [
  {
    name: "test1",
    commandList: [
      {
        name: "Git Commit",
        commandStr: 'git commit -m "${message}"',
        placeholderKeys: ["message"],
      },
      {
        name: "Git Push",
        commandStr: "git push origin ${branch}",
        placeholderKeys: ["branch"],
      },
      {
        name: "Docker Build",
        commandStr: "docker build -t ${image_name}:${tag} .",
        placeholderKeys: ["image_name", "tag"],
      },
    ],
    placeholderConfigs: [
      {
        name: "t",
        commandStreamPlaceholderValues: [
          [
            {
              type: PlaceholderType.Plain,
              value: "commitA",
            },
          ],
          [
            {
              type: PlaceholderType.Plain,
              value: "brach one",
            },
          ],
          [
            {
              type: PlaceholderType.Plain,
              value: "image1",
            },
            {
              type: PlaceholderType.Plain,
              value: "tag1",
            },
          ],
        ],
      },
    ],
    checkRuleConfigs: [
      {
        name: "test1",
        commandStreamCheckRule: [],
      },
    ],
  },
  {
    name: "test2",
    commandList: [
      {
        name: "Git Commit",
        commandStr: 'git commit -m "${message}"',
        placeholderKeys: ["message"],
      },
      {
        name: "Git Push",
        commandStr: "git push origin ${branch}",
        placeholderKeys: ["branch"],
      },
      {
        name: "Docker Build",
        commandStr: "docker build -t ${image_name}:${tag} .",
        placeholderKeys: ["image_name", "tag"],
      },
    ],
    placeholderConfigs: [
      {
        name: "t",
        commandStreamPlaceholderValues: [
          [
            {
              type: PlaceholderType.Plain,
              value: "commitA",
            },
          ],
          [
            {
              type: PlaceholderType.Plain,
              value: "brach one",
            },
          ],
          [
            {
              type: PlaceholderType.Plain,
              value: "image1",
            },
            {
              type: PlaceholderType.Plain,
              value: "tag1",
            },
          ],
        ],
      },
    ],
    checkRuleConfigs: [
      {
        name: "test1",
        commandStreamCheckRule: [],
      },
    ],
  }
];

export const DEFAULT_DB_CONFIG_SETTINGS: DBConfigSettings = {
  itemsPerPage: 10,
  lastFilePath: './electron/mock-postgresql.conf',
  selectedServerId: null,
  isUsingLocalMode: false,
  isUsingManualServer: false,
  manualServerConfig: {
    ip: '',
    port: '22',
    username: '',
    password: '',
  },
  priorityConfig: {
    enabled: false,
    keys: []
  }
};

export const DEFAULT_CONNECTIONS: ConnectionData = {
  server: [
    {
      id: '1',
      name: 'Production Server',
      type: 'server',
      ip: '192.168.1.100',
      port: '22',
      username: 'admin',
      password: '********',
      createdAt: '2023-01-15',
      updatedAt: '2023-06-20'
    },
    {
      id: '2',
      name: 'Development Server',
      type: 'server',
      ip: '192.168.1.101',
      port: '22',
      username: 'dev',
      password: '********',
      createdAt: '2023-02-10',
      updatedAt: '2023-05-15'
    }, {
      id: '3',
      name: 'Production Server',
      type: 'server',
      ip: '192.168.1.100',
      port: '22',
      username: 'admin',
      password: '********',
      createdAt: '2023-01-15',
      updatedAt: '2023-06-20'
    },
    {
      id: '4',
      name: 'Development Server',
      type: 'server',
      ip: '192.168.1.101',
      port: '22',
      username: 'dev',
      password: '********',
      createdAt: '2023-02-10',
      updatedAt: '2023-05-15'
    }],
  database: [
    {
      id: '5',
      name: 'MySQL Production',
      type: 'database',
      ip: '192.168.1.200',
      port: '3306',
      username: 'dbadmin',
      password: '********',
      createdAt: '2023-01-20',
      updatedAt: '2023-07-05'
    },
    {
      id: '6',
      name: 'PostgreSQL Dev',
      type: 'database',
      ip: '192.168.1.201',
      port: '5432',
      username: 'postgres',
      password: '********',
      createdAt: '2023-03-15',
      updatedAt: '2023-06-10'
    },
    {
      id: '7',
      name: 'MySQL Production',
      type: 'database',
      ip: '192.168.1.200',
      port: '3306',
      username: 'dbadmin',
      password: '********',
      createdAt: '2023-01-20',
      updatedAt: '2023-07-05'
    },
    {
      id: '8',
      name: 'PostgreSQL Dev',
      type: 'database',
      ip: '192.168.1.201',
      port: '5432',
      username: 'postgres',
      password: '********',
      createdAt: '2023-03-15',
      updatedAt: '2023-06-10'
    }
  ]
};

export const DEFAULT_SQL_COMMANDS: SQLOrCommandData = {
  sql: [
    {
      id: '1',
      name: 'Get All Users',
      databaseType: "PostgreSql",
      content: 'SELECT * FROM users;',
      description: 'Retrieves all user records from the database',
      createdAt: '2023-01-15',
      updatedAt: '2023-06-20'
    },
    {
      id: '2',
      name: 'Count Active Users',
      databaseType: "PostgreSql",
      content: 'SELECT COUNT(*) FROM users WHERE status = "active";',
      description: 'Count all active users in the system',
      createdAt: '2023-02-10',
      updatedAt: '2023-05-15'
    },
    {
      id: '3',
      name: 'Find Recent Orders',
      databaseType: "MySql",
      content: 'SELECT * FROM orders WHERE order_date > DATE_SUB(NOW(), INTERVAL 7 DAY);',
      description: 'Retrieves orders from the last 7 days',
      createdAt: '2023-03-15',
      updatedAt: '2023-07-05'
    },
    {
      id: '4',
      name: 'Product Inventory',
      databaseType: "MySql",
      content: 'SELECT p.name, p.sku, i.quantity FROM products p JOIN inventory i ON p.id = i.product_id;',
      description: 'Shows current inventory levels for all products',
      createdAt: '2023-04-10',
      updatedAt: '2023-06-10'
    }
  ],
  command: [
    {
      id: '5',
      name: 'List Files',
      content: 'ls -la',
      description: 'Lists all files in the current directory with detailed information',
      createdAt: '2023-01-20',
      updatedAt: '2023-07-05'
    },
    {
      id: '6',
      name: 'Check Disk Space',
      content: 'df -h',
      description: 'Shows disk space usage in human-readable format',
      createdAt: '2023-03-15',
      updatedAt: '2023-06-10'
    },
    {
      id: '7',
      name: 'Process Status',
      content: 'ps aux | grep node',
      description: 'Lists all Node.js processes currently running',
      createdAt: '2023-05-10',
      updatedAt: '2023-08-15'
    },
    {
      id: '8',
      name: 'Network Status',
      content: 'netstat -tuln',
      description: 'Displays all active network connections and listening ports',
      createdAt: '2023-02-25',
      updatedAt: '2023-06-30'
    }
  ]
};
