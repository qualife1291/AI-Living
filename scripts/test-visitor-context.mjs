import assert from 'node:assert/strict';
import {localContextReply,replyToVisitor} from '../lib/living/interaction.ts';
import {seed} from '../lib/world.ts';

// Only the simulation's current location and activity may enter a contextual
// reply. Objects, completed work, real sightings and learning are not inferred.
const garden=localContextReply('Vườn nhỏ','Quan sát luống rau','Cây này đã được tưới chưa?');
assert.match(garden,/Vườn nhỏ/);
assert.match(garden,/chưa có bản ghi xác nhận/);
assert.doesNotMatch(garden,/đã tưới xong|cây này đang khô/);

const away=localContextReply('Văn phòng','Viết ghi chú','Vườn hoa hôm nay thế nào?');
assert.match(away,/chưa có quan sát cây cụ thể/);
assert.doesNotMatch(away,/hoa đang nở|cây đang tốt/);

const books=localContextReply('Thư viện','Tìm tài liệu','Bạn đọc cuốn sách này chưa?');
assert.match(books,/Thư viện/);
assert.match(books,/chưa có dữ liệu xác nhận/);

const animals=localContextReply('Công viên','Nghỉ chân','Bạn thấy chú mèo này chưa?');
assert.match(animals,/chưa có ghi nhận được kiểm chứng/);

assert.equal(localContextReply('Sân chung','Nghỉ chân','Chào bạn'),null);
const before=JSON.stringify(seed),when=Date.parse(seed.born)+12*3600000;
const reply=replyToVisitor(seed,'an','Mèo ở đâu?',when);
assert.equal(reply?.source,'rules');
assert.match(reply.text,/chưa có ghi nhận được kiểm chứng/);
assert.equal(JSON.stringify(seed),before,'Viewer dialogue cannot mutate world or learning state');
console.log(JSON.stringify({suite:'visitor-context',cases:6,groundedToSimulatedVenue:true,noInventedSightings:true,worldWrites:false}));
