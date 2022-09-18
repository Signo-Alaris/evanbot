import nacl from 'tweetnacl';
import fetch from "node-fetch";

const handler = async (event) => {
  console.log("Event: ", event);
  const baseApi = "https://discord.com/api/v8";
  const PUBLIC_KEY = process.env.PUBLIC_KEY;
  const signature = event.headers['x-signature-ed25519']
  const timestamp = event.headers['x-signature-timestamp'];
  const strBody = event.body; // should be string, for successful sign
  const headers = {
    "Authorization": `Bot ${process.env.BOT_TOKEN}`,
    "Content-Type": "application/json"
  };

  const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + strBody),
    Buffer.from(signature, 'hex'),
    Buffer.from(PUBLIC_KEY, 'hex')
  );
  console.log({isVerified});

  if (!isVerified) {
    console.log("Request is not verified, rejected.");
    return {
      statusCode: 401,
      body: JSON.stringify('invalid request signature'),
    };
  }
  // Replying to ping (requirement 2.)
  const interaction = JSON.parse(strBody);
  const {guild_id} = interaction;
  if (interaction.type == 1) {
    console.log("Ping request, pong response.");
    return {
      statusCode: 200,
      body: JSON.stringify({ "type": 1 }),
    }
  }

  let lfgRoleGroup = {
    "found": false,
    "id": ""
  };
  const getLfgRoleList = async () => {
    const url = `${baseApi}/guilds/${guild_id}/roles`

    const roles = await fetch(url, { method: "GET", headers })
    .then((rawRoles) => rawRoles.json())
    .then((roles) => {
      console.log("Roles in this server: ", roles);
      return roles;
    });

    return roles;
  };
  const roleList = await getLfgRoleList();
  const checkForLfgGroupInRoleList = (roleList) => {
    for(let i=0; i<roleList.length; i++) {
      if(roleList[i].name==='LFG') {
        lfgRoleGroup.found = true;
        lfgRoleGroup.id = roleList[i].id
        break;
      }
    }

    console.log(`LFG role group exists: ${lfgRoleGroup.found}, ${lfgRoleGroup.id}`)
    return lfgRoleGroup;
  }
  checkForLfgGroupInRoleList(roleList);
  const lfgGroupExists = lfgRoleGroup.found;
  
  // Handle /lfg Command
  if (interaction.data.name == 'lfg') {
    if (!lfgGroupExists) {
      const createLfgRoleGroup = async () => {
        let url = `${baseApi}/guilds/${guild_id}/roles`;
  
        let createLfgRoleGroupBody = {
          "name": "LFG",
          "permissions": "1071698660929",
          "color": 2067276,
          "hoist": true,
          "mentionable": true
        }

        const createLfgRoleGroupResponse = await fetch(url, { method: "POST", headers, body: JSON.stringify(createLfgRoleGroupBody) })
        .then((rawcreateLfgRoleGroupResponse) => rawcreateLfgRoleGroupResponse.json())
        .then((result) => {
          console.log("hey", {result});
          lfgRoleGroup.id = result.id;
          return result;
        })
        .catch((error) => {
          console.log(`Error creating LFG role in Guild ${guild_id}: `, error);
          throw new Error(error);
        });
    
        return createLfgRoleGroupResponse.statusCode;
      };
      const lfgRoleGroupCreated = await createLfgRoleGroup;
      console.log(`LFG role group created? ${lfgRoleGroupCreated}`);
    }
    
    const addThisUserToLfgGroup = async () => {
      let url = `${baseApi}/guilds/${guild_id}/members/${interaction.member.user.id}/roles/${lfgRoleGroup.id}`

      const headers = {
        "Authorization": `Bot ${process.env.BOT_TOKEN}`,
        "Content-Type": "application/json"
      }
      
      await fetch(url, { method: "PUT", headers })
        .catch((error) => {
          throw Error(error);
        });
    };
    await addThisUserToLfgGroup();
    console.log('User added to LFG group');
    
    const lfgResponse = {
      statusCode: 200,
      body: JSON.stringify({
        "type": 4,
        "data": {
          "content": "You're now looking for a group, good luck!",
          "flags": 64,
        },
      }),
      headers: {
        "Content-Type": "application/json"
      }
    };
    console.log("Request for lfg received, response to follow");
    console.log({lfgResponse});
    return lfgResponse;
  }

  // Handle /nlfg Command
  if (interaction.data.name == 'nlfg') {
    const removeThisUserToLfgGroup = async () => {
      let url = `${baseApi}/guilds/${guild_id}/members/${interaction.member.user.id}/roles/${lfgRoleGroup.id}`;
      
      return await fetch(url, { method: "DELETE", headers })
        .catch((error) => {
          throw Error(error);
        });
    };
    await removeThisUserToLfgGroup();
    console.log('User removed from LFG group');
    
    const nlfgResponse = {
      statusCode: 200,
      body: JSON.stringify({
        "type": 4,
        "data": {
          "content": "Not looking for a group anymore, see you later!",
          "flags": 64,
        },
      }),
      headers: {
        "Content-Type": "application/json"
      }
    }
    console.log("Request for nlfg received, response to follow");
    console.log({nlfgResponse});
    return nlfgResponse
  }

console.log("No recognised control flow for command, 404.");
  return {
    statusCode: 404  // If no handler implemented for Discord's request
  }
};

export default handler;

export { handler }