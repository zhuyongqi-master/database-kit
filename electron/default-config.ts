import { CheckRuleType, CommandStream, PlaceholderType } from "@/types/command";
import { DBConfigSettings } from "@/types/db-config";
import { ConnectionData } from "@/types/connection";
import { SQLOrCommandData } from "@/types/sql-or-command";

export const DEFAULT_COMMAND_STREAMS: CommandStream[] = [
  {
    name: "psql执行sql",
    commandList: [
      {
        name: "psql",
        commandStr: "export PGPASSWORD='${pwd}' && cd ${psqlPath} && ./psql -h ${ip} -p ${port} -U ${user} -c \"\\pset pager off\" -c \"${sql}\"",
        placeholderKeys: [
          "pwd",
          "psqlPath",
          "ip",
          "port",
          "user",
          "sql"
        ]
      }
    ],
    placeholderConfigs: [
      {
        name: "default",
        commandStreamPlaceholderValues: [
          [
            {
              type: PlaceholderType.DatabaseInfo,
              value: "password"
            },
            {
              type: PlaceholderType.Plain,
              value: "/usr/lib/postgresql/17/bin/"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "ip"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "port"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "username"
            },
            {
              type: PlaceholderType.Plain,
              value: "select * from pg_database"
            }
          ]
        ]
      }
    ],
    checkRuleConfigs: [
      {
        name: "default",
        commandStreamCheckRule: [
          []
        ]
      }
    ]
  },
  {
    name: "瀚高清理指定前缀数据库",
    commandList: [
      {
        name: "进入psql目录并设置环境变量",
        commandStr: "cd ${psql_dir} && export PGPASSWORD='${pwd}'",
        placeholderKeys: [
          "psql_dir",
          "pwd"
        ]
      },
      {
        name: "删库",
        commandStr: "for i in `./psql -h ${ip} -p ${port} -U ${user} -c \"select datname from pg_database where datname like '${prefix}'\" -t | awk '{print $1}'`; do echo $i; ./psql -h ${ip} -p ${port} -U ${user}  -c \"drop database \\\"$i\\\"\" ; done",
        placeholderKeys: [
          "ip",
          "port",
          "user",
          "prefix"
        ]
      },
      {
        name: "检查是否删除",
        commandStr: "./psql -h ${ip} -p ${port} -U ${user} -c \"select count(*) from pg_database where datname like '${prefix}'\" -t",
        placeholderKeys: [
          "ip",
          "port",
          "user",
          "prefix"
        ]
      }
    ],
    placeholderConfigs: [
      {
        name: "default",
        commandStreamPlaceholderValues: [
          [
            {
              type: PlaceholderType.Plain,
              value: "/usr/lib/postgresql/17/bin/"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "password"
            }
          ],
          [
            {
              type: PlaceholderType.DatabaseInfo,
              value: "ip"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "port"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "username"
            },
            {
              type: PlaceholderType.Plain,
              value: "%db%"
            }
          ],
          [
            {
              type: PlaceholderType.DatabaseInfo,
              value: "ip"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "port"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "username"
            },
            {
              type: PlaceholderType.Plain,
              value: "%db%"
            }
          ]
        ]
      }
    ],
    checkRuleConfigs: [
      {
        name: "default",
        commandStreamCheckRule: [
          [],
          [],
          [
            {
              name: "无输出",
              type: CheckRuleType.StringEqual,
              value: "0"
            }
          ]
        ]
      }
    ]
  },
  {
    name: "瀚高清理指定前缀用户",
    commandList: [
      {
        name: "进入psql目录并设置环境变量",
        commandStr: "cd ${psql_dir} && export PGPASSWORD='${pwd}'",
        placeholderKeys: [
          "psql_dir",
          "pwd"
        ]
      },
      {
        name: "删库",
        commandStr: "for i in `./psql -h ${ip} -p ${port} -U ${user} -c \"\\du\"  |  grep -E 'db_user' | awk '{print $1}' | grep -v \\|`; do echo $i; ./psql -h ${ip} -p ${port} -U ${user} -c \"drop user \\\"$i\\\"\" ; done",
        placeholderKeys: [
          "ip",
          "port",
          "user"
        ]
      },
      {
        name: "检查是否删除",
        commandStr: "./psql -h ${ip} -p ${port} -U ${user} -c \"select count(*) from pg_roles where rolname like '${prefix}'\" -t",
        placeholderKeys: [
          "ip",
          "port",
          "user",
          "prefix"
        ]
      }
    ],
    placeholderConfigs: [
      {
        name: "default",
        commandStreamPlaceholderValues: [
          [
            {
              type: PlaceholderType.Plain,
              value: "/usr/lib/postgresql/17/bin/"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "password"
            }
          ],
          [
            {
              type: PlaceholderType.DatabaseInfo,
              value: "ip"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "port"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "username"
            }
          ],
          [
            {
              type: PlaceholderType.DatabaseInfo,
              value: "ip"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "port"
            },
            {
              type: PlaceholderType.DatabaseInfo,
              value: "username"
            },
            {
              type: PlaceholderType.Plain,
              value: "db_user%"
            }
          ]
        ]
      }
    ],
    checkRuleConfigs: [
      {
        name: "default",
        commandStreamCheckRule: [
          [],
          [],
          [
            {
              name: "无输出",
              type: CheckRuleType.StringEqual,
              value: "0"
            }
          ]
        ]
      }
    ]
  }
];

export const DEFAULT_DB_CONFIG_SETTINGS: DBConfigSettings = {
  itemsPerPage: 10,
  lastFilePath: './postgresql.conf',
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
      name: '测试服务器',
      type: 'server',
      ip: '127.0.0.1',
      port: '22',
      username: 'root',
      password: '12345678',
      createdAt: '2025-06-03',
      updatedAt: '2025-06-03'
    }
    ],
  database: [
    {
      id: '1',
      name: '测试pg数据库',
      type: 'database',
      ip: '127.0.0.1',
      port: '5432',
      username: 'postgres',
      password: 'postgres',
      createdAt: '2025-06-03',
      updatedAt: '2025-06-03'
    }
  ]
};

export const DEFAULT_SQL_COMMANDS: SQLOrCommandData = {
  sql: [
    {
      id: "1",
      name: "查看某连接的ssl",
      databaseType: "PostgreSQL",
      content: "select ssl,* from pg_stat_get_activity(NULL::integer);",
      description: "查看ssl那一列",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "2",
      name: "查看某连接对应的数据库用户",
      databaseType: "PostgreSQL",
      content: "select ssl,b.usename,a.* from pg_stat_get_activity(NULL::integer) a left join pg_user b on a.usesysid=b.usesysid;",
      description: "通过pg_user系统表查询连接的数据库用户名",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "3",
      name: "查看最大连接数设置",
      databaseType: "PostgreSQL",
      content: "show max_connections;",
      description: "显示PostgreSQL的最大连接数配置",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "4",
      name: "查看当前还有多少连接可用",
      databaseType: "PostgreSQL",
      content: "select max_conn-now_conn as resi_conn from (select setting::int8 as max_conn,(select count(*) from pg_stat_activity) as now_conn from pg_settings where name = 'max_connections') t;",
      description: "计算当前剩余可用连接数量",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "5",
      name: "分组统计组件连接数",
      databaseType: "PostgreSQL",
      content: "select query,datname,usename,state,count(*) as linkCount from pg_stat_activity group by query,datname,usename,state order by linkCount desc;",
      description: "按查询、数据库名、用户名和状态分组，统计连接数并排序",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "6",
      name: "查询某张表上次回收和分析的时间",
      databaseType: "PostgreSQL",
      content: "SELECT schemaname, relname, last_autovacuum,last_vacuum,last_autoanalyze,last_analyze FROM pg_stat_all_tables WHERE relname = '表名';",
      description: "只看用户表，不看系统表的话换成pg_stat_user_tables",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "7",
      name: "查看自动回收相关参数",
      databaseType: "PostgreSQL",
      content: "select * from pg_settings where name ~ 'vacuum';",
      description: "查看与VACUUM相关的配置参数",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "8",
      name: "判断当前机器是集群主还是备",
      databaseType: "PostgreSQL",
      content: "select local_role, db_state from pg_stat_get_stream_replications();",
      description: "Primary是主节点，Standby是备节点",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "9",
      name: "查看保留关键字",
      databaseType: "PostgreSQL",
      content: "select * from pg_get_keywords() where catcode in ('R','T');",
      description: "获取PostgreSQL中的保留关键字列表",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "10",
      name: "查看触发器",
      databaseType: "PostgreSQL",
      content: "SELECT n.nspname AS schema_name, c.relname AS table_name,--触发器所在表名 t.tgname AS trigger_name,--触发器名称 pg_catalog.pg_get_triggerdef(t.old, true) AS trigger_definition --触发器定义 FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid WHERE NOT t.tgisinternal;--排除内置触发器",
      description: "查询所有自定义触发器及其定义信息",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "11",
      name: "连接数据库",
      databaseType: "Dameng",
      content: "cd到达梦的bin目录下\n./disql 用户名/密码@ip:port",
      description: "用于连接达梦数据库",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "12",
      name: "查看版本",
      databaseType: "Dameng",
      content: "SELECT build_version FROM v$instance;",
      description: "查询达梦数据库的版本信息",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "13",
      name: "查看数据库授权到期时间",
      databaseType: "Dameng",
      content: "select expired_date from SYS.\"V$LICENSE\";",
      description: "查询达梦数据库许可证的有效期",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "14",
      name: "查看当前实例大小写是否敏感",
      databaseType: "Dameng",
      content: "select case_sensitive();\nselect case_sensitive;",
      description: "检查达梦数据库当前实例对大小写的敏感性",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "15",
      name: "查看保留字",
      databaseType: "Dameng",
      content: "SELECT * FROM v$reserved_words;",
      description: "查询达梦数据库中的保留关键字列表",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "16",
      name: "查看所有用户",
      databaseType: "Dameng",
      content: "select * from dba_users;",
      description: "列出达梦数据库中所有的用户",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "17",
      name: "查看系统内置函数",
      databaseType: "Dameng",
      content: "SELECT * FROM V$IFUN ORDER BY name asc;",
      description: "查询达梦数据库中所有的内置函数",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "18",
      name: "查看系统视图",
      databaseType: "Dameng",
      content: "SELECT * FROM V$DYNAMIC_TABLES ORDER BY name asc;",
      description: "列出达梦数据库中的系统动态视图",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "19",
      name: "查看所有索引",
      databaseType: "Dameng",
      content: "SELECT * FROM ALL_INDEXES;",
      description: "查询达梦数据库中所有表的索引信息",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "20",
      name: "查看系统表/数据字典",
      databaseType: "Dameng",
      content: "SELECT * FROM sysobjects WHERE subtype$ = 'STAB' or type$ = 'DSYNOM' ORDER BY NAME ASC;",
      description: "查询达梦数据库中的系统表或数据字典",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    }
  ],
  command: [
    {
      id: "1",
      name: "执行SQL文件",
      content: "psql -U username -d dbname -f filename.sql",
      description: "使用psql工具执行指定的SQL脚本文件。可以用于导入数据或执行数据库结构变更。",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "2",
      name: "导出数据库到SQL文件",
      content: "pg_dump -U username -d dbname > backup.sql",
      description: "通过pg_dump将指定数据库导出为纯文本SQL格式的备份文件。",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "3",
      name: "从SQL文件恢复数据库",
      content: "psql -U username -d dbname < backup.sql",
      description: "通过psql工具将SQL备份文件导入到目标数据库中。",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "4",
      name: "忽略错误执行SQL文件",
      content: "psql -U username -d dbname -v ON_ERROR_STOP=0 -f filename.sql",
      description: "执行SQL文件时即使遇到错误也继续执行，避免因单条语句失败导致整个脚本中断。",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "5",
      name: "执行内联SQL命令",
      content: "psql -c \"SELECT * FROM table_name;\"",
      description: "在命令行中直接执行单条SQL语句，无需进入交互式psql shell。",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "6",
      name: "连接远程PostgreSQL数据库并执行SQL",
      content: "psql -h hostname -U username -d dbname -c \"SELECT * FROM table_name;\"",
      description: "连接到远程主机上的PostgreSQL数据库并执行查询。",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "7",
      name: "使用 pg_restore 恢复归档格式备份",
      content: "pg_restore -U username -d dbname -v backup.tar",
      description: "恢复由 pg_dump 创建的 tar 或 custom 格式的 PostgreSQL 数据库备份。",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    },
    {
      id: "8",
      name: "使用 pg_restore 恢复归档格式备份",
      content: "pg_restore -U username -d dbname -v backup.tar",
      description: "恢复由 pg_dump 创建的 tar 或 custom 格式的 PostgreSQL 数据库备份。",
      createdAt: "2025-06-03",
      updatedAt: "2025-06-03"
    }
  ]
};
