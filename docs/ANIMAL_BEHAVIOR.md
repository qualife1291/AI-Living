# Động vật: nguồn và cách mô phỏng

Đây là tài liệu thiết kế mô phỏng, không phải hướng dẫn chăm sóc y tế và không phải mô hình AI được huấn luyện riêng cho từng loài.

| Cư dân | Nguồn tham khảo | Luật đang có |
|---|---|---|
| Mướp (mèo) | Cats Protection: chơi, ngủ | Nghỉ yên tĩnh, khám phá quanh vườn, quan sát, vờn đồ chơi |
| Cún (chó) | RSPCA: body language; Dogs Trust | Đánh hơi lối đi, khám phá, mời chơi, nghỉ và uống nước |
| Đàn sẻ | Cornell Lab of Ornithology: House Sparrow | Đi theo đàn, nhảy, kiếm hạt trên mặt đất, đậu quan sát |

Nguồn công khai đã đọc qua tìm kiếm ngày 24/10/2026:

- https://www.cats.org.uk/help-and-advice/cat-behaviour/cats-and-play
- https://www.cats.org.uk/help-and-advice/cat-behaviour/cats-and-sleep
- https://www.rspca.org.uk/en/adviceandwelfare/pets/dogs/behaviour/understanding
- https://www.dogstrust.org.uk/dog-advice/understanding-your-dog/body-language
- https://www.allaboutbirds.org/guide/House_Sparrow/lifehistory

Tài liệu mèo nhấn mạnh nhu cầu chơi/nghỉ; tài liệu chó mô tả giao tiếp qua tư thế và mùi; Cornell mô tả sẻ có tính xã hội và kiếm ăn theo đàn. Mã không mô phỏng đầy đủ sinh học hay dùng dữ liệu huấn luyện từ các trang này. Câu mô tả hành vi đã được diễn giải, không sao chép nội dung dài hoặc tài sản hình ảnh.

## Giới hạn hiện tại

- Animals chưa có database state, stress/health/social memory riêng.
- Cún chưa thực sự tìm/follow một robot; lời mời chơi là hoạt động và minh họa theo chu kỳ.
- Chim hiện đi theo graph và dùng sprite đàn; chưa có flight steering hoặc boids.
- Nhu cầu uống nước/ngủ là hoạt cảnh, chưa cân bằng calories/sức khỏe.
- Không nói tiếng người; schema event chỉ cho robot làm speaker.
- Không cho mèo săn/chó đuổi sẻ như trò chơi. Robot có thể quan sát và chăm sóc theo mô tả cảnh.

## Sau này

Behavior tree/utility AI theo nhu cầu, khoảng cách an toàn, nhịp hoạt động loài, khả năng tiếp cận và tương tác hai chiều. Lưu quan hệ tin cậy với robot và sự kiện đáng nhớ; kiểm thử để động vật không kẹt, không xuyên nhà, không bị robot ép tương tác.
