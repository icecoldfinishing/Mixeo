using System;
using System.IO;

namespace Mixeo.Common;

public static class FileLogger
{
    private static readonly string LogDir = GetSharedLogDir();
    private static readonly string LogFile = Path.Combine(LogDir, "mixeo-app.log");
    private static readonly object _lock = new object();

    private static string GetSharedLogDir()
    {
        string? dir = AppDomain.CurrentDomain.BaseDirectory;
        while (dir != null)
        {
            if (Directory.Exists(Path.Combine(dir, "Mixeo.Common")))
            {
                return Path.Combine(dir, "logs");
            }
            dir = Directory.GetParent(dir)?.FullName;
        }
        return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs");
    }

    public static void Log(string module, string message)
    {
        try
        {
            lock (_lock)
            {
                Directory.CreateDirectory(LogDir);
                string logLine = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] [{module}] {message}{Environment.NewLine}";
                File.AppendAllText(LogFile, logLine);
                System.Diagnostics.Debug.WriteLine(logLine);
                Console.Write(logLine); // Added for console visibility where applicable
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Failed to write log: {ex.Message}");
        }
    }
}