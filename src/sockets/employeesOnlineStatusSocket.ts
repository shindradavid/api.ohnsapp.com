import { Socket as SocketIoServer, Server } from 'socket.io';

type EmployeeType = 'admin' | 'driver' | 'rider';

interface EmployeePresence {
  socketId: string;
  employeeId: string;
  type: EmployeeType;
}

const onlineEmployees = new Map<string, EmployeePresence>();

export const presenceManager = {
  add: (employeeId: string, socketId: string, type: EmployeeType) => {
    onlineEmployees.set(employeeId, { employeeId, socketId, type });
  },

  remove: (employeeId: string) => {
    onlineEmployees.delete(employeeId);
  },

  getAll: () => Array.from(onlineEmployees.values()),

  getByType: (type: EmployeeType) => Array.from(onlineEmployees.values()).filter((e) => e.type === type),

  isOnline: (employeeId: string) => onlineEmployees.has(employeeId),
};

const employeesOnlineStatusSocket = (io: Server, socket: SocketIoServer) => {
  io.on('connection', async (socket) => {
    console.log('⚡ New socket connected:', socket.id);

    // --- Step 1: Authenticate user
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log('❌ Missing token, disconnecting');
      return socket.disconnect();
    }

    try {
      const decoded: any = jwt.verify(token, envHelper.JWT_SECRET);
      const employeeRepo = databaseClient.getRepository(Employee);
      const employee = await employeeRepo.findOne({ where: { id: decoded.employeeId } });

      if (!employee) {
        console.log('❌ Employee not found, disconnecting');
        return socket.disconnect();
      }

      // --- Step 2: Register employee as online
      presenceManager.addEmployee(employee.id, socket.id, employee.type);
      console.log(`✅ ${employee.type} (${employee.id}) is now online`);

      // --- Step 3: Notify admins
      const admins = presenceManager.getOnlineByType('admin');
      for (const admin of admins) {
        io.to(admin.socketId).emit('employee:online', {
          id: employee.id,
          type: employee.type,
        });
      }

      // --- Step 4: Handle disconnection
      socket.on('disconnect', () => {
        presenceManager.removeEmployee(employee.id);
        console.log(`🚪 ${employee.type} (${employee.id}) disconnected`);

        // Notify admins
        const admins = presenceManager.getOnlineByType('admin');
        for (const admin of admins) {
          io.to(admin.socketId).emit('employee:offline', {
            id: employee.id,
            type: employee.type,
          });
        }
      });
    } catch (err) {
      console.log('❌ Invalid token');
      socket.disconnect();
    }
  });
};
