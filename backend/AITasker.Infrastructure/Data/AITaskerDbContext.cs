using Microsoft.EntityFrameworkCore;
using AITasker.Domain.Entities;

namespace AITasker.Infrastructure.Data;

public class AITaskerDbContext : DbContext
{
    public AITaskerDbContext(DbContextOptions<AITaskerDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
}
