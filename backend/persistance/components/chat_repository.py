from persistance.db import get_db

class ChatRepository:
    async def save_message(conversation_id: int, role: str, content: str):
        async with await get_db() as db:
            await db.execute(
                "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
                (conversation_id, role, content)
            )
            await db.commit()
    
    async def get_messages(conversation_id: int) -> list:
        async with await get_db() as db:
            cursor = await db.execute(
                "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at",
                (conversation_id,)
            )
            return await cursor.fetchall()