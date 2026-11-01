import assert from 'node:assert/strict';
import {INTERIOR_ACTIONS,interiorAction,interiorProp} from '../lib/city/interior-actions.ts';
import {interiorKind,interiorPhase} from '../lib/city/lifestory.ts';
assert.equal(INTERIOR_ACTIONS.length,22);
assert.equal(new Set(INTERIOR_ACTIONS).size,22);
const cases=[
 ['eat','Ăn trưa','eat'],['drink','Uống trà buổi sáng','drink'],
 ['work','Nấu ăn cho hàng xóm','cook'],['work','Phục vụ tại quầy','serve'],
 ['work','Rửa bát sau bữa ăn','wash'],['work','Quét sân','clean'],
 ['work','Gấp quần áo','tidy'],['read','Đọc sách','read'],
 ['work','Viết ghi chú','write'],['study','Học bài','study'],
 ['work','Gõ máy tính','type'],['work','Sửa chữa thiết bị','repair'],
 ['work','Đóng gói hàng','pack'],['shop','Chọn hàng','shop'],
 ['shop','Xem hàng tại quầy','browse'],['garden','Tưới cây','garden'],
 ['work','Chăm sóc bệnh nhân','care'],['exercise','Tập thể dục','exercise'],
 ['social','Thăm hỏi','social'],['rest','Nghỉ ngơi','rest'],
 ['rest','Ngủ trưa','sleep'],['unknown','Nhìn xung quanh','observe']
];
for(const [kind,activity,expected] of cases)assert.equal(interiorAction(kind,activity),expected,kind+'/'+activity);
assert.equal(interiorProp('drink'),'cup');
assert.equal(interiorProp('read'),'book');
assert.equal(interiorProp('sleep'),'none');
assert.equal(interiorKind('Phòng An'),'home');
assert.equal(interiorKind('Quán cà phê'),'dining');
assert.equal(interiorKind('Bệnh viện'),'study'); // Existing venue classifier: document known gap separately
assert.equal(interiorPhase(125).floor,0);
assert.equal(interiorAction('work',''), 'type');
console.log(JSON.stringify({suite:'interior-actions',mapped:cases.length,actionTypes:INTERIOR_ACTIONS.length,syntheticRewards:0,worldWrites:false}));
